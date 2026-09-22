"""
LILA Pathfinder — Data Preprocessing Pipeline
Transforms raw parquet telemetry files into optimized JSON for the frontend.

Usage:
    python scripts/preprocess.py --input ./player_data --output ./public/data

What it does:
    1. Reads all 1,243 parquet files across 5 days
    2. Decodes event bytes to strings
    3. Classifies human vs bot by user_id format (UUID = human, numeric = bot)
    4. Groups events by match_id across all files
    5. Computes match-level relative timestamps (ts_relative across ALL players)
    6. Pre-computes pixel coordinates (x,z → px,py) using per-map config
    7. Converts minimap images to 1024x1024 WebP
    8. Outputs: 3 map JSONs + 1 metadata JSON
"""

import pyarrow.parquet as pq
import pandas as pd
import json
import os
import re
import sys
import argparse
import time
from collections import defaultdict

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False
    print("[WARN] Pillow not installed. Minimap optimization will be skipped.")
    print("       Install with: pip install Pillow")

# ─── Configuration ────────────────────────────────────────────────────────────

MAP_CONFIG = {
    "AmbroseValley": {
        "scale": 900,
        "origin_x": -370,
        "origin_z": -473,
        "json_key": "ambrose_valley",
        "minimap_src": "AmbroseValley_Minimap.png",
        "minimap_out": "AmbroseValley_Minimap.webp",
    },
    "GrandRift": {
        "scale": 581,
        "origin_x": -290,
        "origin_z": -290,
        "json_key": "grand_rift",
        "minimap_src": "GrandRift_Minimap.png",
        "minimap_out": "GrandRift_Minimap.webp",
    },
    "Lockdown": {
        "scale": 1000,
        "origin_x": -500,
        "origin_z": -500,
        "json_key": "lockdown",
        "minimap_src": "Lockdown_Minimap.jpg",
        "minimap_out": "Lockdown_Minimap.webp",
    },
}

DATE_FOLDERS = ["February_10", "February_11", "February_12", "February_13", "February_14"]
PARTIAL_DATES = ["February_14"]

UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)

# Short event type keys to minimize JSON size
EVENT_SHORT = {
    "Position": "P",
    "BotPosition": "BP",
    "Kill": "K",
    "Killed": "D",       # D for Death (killed by human)
    "BotKill": "BK",
    "BotKilled": "BD",
    "KilledByStorm": "S",  # S for Storm
    "Loot": "L",
}

# ─── Core Functions ───────────────────────────────────────────────────────────

def is_human(user_id: str) -> bool:
    """Classify user as human (UUID) or bot (numeric)."""
    return bool(UUID_PATTERN.match(str(user_id)))


def world_to_pixel(x: float, z: float, map_id: str) -> tuple:
    """Convert world coordinates to pixel coordinates on 1024x1024 minimap."""
    cfg = MAP_CONFIG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    px = int(round(u * 1024))
    py = int(round((1 - v) * 1024))
    # Clamp to valid pixel range
    px = max(0, min(1023, px))
    py = max(0, min(1023, py))
    return px, py


def clean_match_id(match_id: str) -> str:
    """Strip the .nakama-0 suffix from match_id."""
    return str(match_id).replace(".nakama-0", "")


def load_all_files(input_dir: str):
    """Load all parquet files from all date folders. Returns list of (date, df) tuples."""
    all_frames = []
    stats = {"files_read": 0, "files_failed": 0, "errors": []}

    for date_folder in DATE_FOLDERS:
        folder_path = os.path.join(input_dir, date_folder)
        if not os.path.exists(folder_path):
            print(f"  [SKIP] {date_folder} not found")
            continue

        files = [f for f in os.listdir(folder_path) if not f.startswith('.')]
        print(f"  Reading {date_folder}: {len(files)} files...", end=" ", flush=True)

        day_frames = []
        for f in files:
            filepath = os.path.join(folder_path, f)
            try:
                table = pq.read_table(filepath)
                df = table.to_pandas()
                df["_date"] = date_folder
                df["_source_file"] = f
                day_frames.append(df)
                stats["files_read"] += 1
            except Exception as e:
                stats["files_failed"] += 1
                stats["errors"].append((f, str(e)))

        if day_frames:
            all_frames.extend(day_frames)
        print(f"OK ({len(day_frames)} loaded)")

    if stats["files_failed"] > 0:
        print(f"\n  [WARN] {stats['files_failed']} files failed to read:")
        for fn, err in stats["errors"][:5]:
            print(f"    {fn}: {err}")

    return all_frames, stats


def process_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all transformations to raw dataframe."""
    # 1. Decode event bytes
    df["event_str"] = df["event"].apply(
        lambda x: x.decode("utf-8") if isinstance(x, bytes) else str(x)
    )

    # 2. Classify human vs bot by user_id
    df["is_bot"] = ~df["user_id"].apply(is_human)

    # 3. Clean match_id
    df["match_id_clean"] = df["match_id"].apply(clean_match_id)

    # 4. Compute pixel coordinates
    px_list = []
    py_list = []
    for _, row in df.iterrows():
        px, py = world_to_pixel(row["x"], row["z"], row["map_id"])
        px_list.append(px)
        py_list.append(py)
    df["px"] = px_list
    df["py"] = py_list

    # 5. Short event key
    df["event_key"] = df["event_str"].map(EVENT_SHORT).fillna(df["event_str"])

    return df


def process_dataframe_vectorized(df: pd.DataFrame) -> pd.DataFrame:
    """Vectorized version — much faster for large datasets."""
    # 1. Decode event bytes
    df["event_str"] = df["event"].apply(
        lambda x: x.decode("utf-8") if isinstance(x, bytes) else str(x)
    )

    # 2. Classify human vs bot by user_id
    df["is_bot"] = ~df["user_id"].str.match(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        case=False
    )

    # 3. Clean match_id
    df["match_id_clean"] = df["match_id"].str.replace(".nakama-0", "", regex=False)

    # 4. Compute pixel coordinates (vectorized per map)
    df["px"] = 0
    df["py"] = 0
    for map_id, cfg in MAP_CONFIG.items():
        mask = df["map_id"] == map_id
        if mask.sum() == 0:
            continue
        u = (df.loc[mask, "x"] - cfg["origin_x"]) / cfg["scale"]
        v = (df.loc[mask, "z"] - cfg["origin_z"]) / cfg["scale"]
        df.loc[mask, "px"] = (u * 1024).round().astype(int).clip(0, 1023)
        df.loc[mask, "py"] = ((1 - v) * 1024).round().astype(int).clip(0, 1023)

    # 5. Short event key
    df["event_key"] = df["event_str"].map(EVENT_SHORT).fillna(df["event_str"])

    return df


def compute_match_relative_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute match-level relative timestamps.
    For each match_id, find the global min ts across ALL players in that match,
    then compute ts_relative = (ts - min_ts) in milliseconds.
    """
    # Group by clean match_id, find global min timestamp per match
    match_min_ts = df.groupby("match_id_clean")["ts"].min().rename("match_min_ts")
    df = df.merge(match_min_ts, left_on="match_id_clean", right_index=True, how="left")

    # Compute relative timestamp in milliseconds
    df["ts_ms"] = ((df["ts"] - df["match_min_ts"]).dt.total_seconds() * 1000).astype(int)

    # Compute match duration
    match_max_ts = df.groupby("match_id_clean")["ts"].max().rename("match_max_ts")
    df = df.merge(match_max_ts, left_on="match_id_clean", right_index=True, how="left")
    df["match_duration_ms"] = (
        (df["match_max_ts"] - df["match_min_ts"]).dt.total_seconds() * 1000
    ).astype(int)

    return df


def build_map_json(df: pd.DataFrame, map_id: str) -> dict:
    """Build the JSON structure for a single map."""
    map_df = df[df["map_id"] == map_id].copy()

    if len(map_df) == 0:
        return {"map_id": map_id, "matches": {}}

    matches = {}
    for match_id, match_df in map_df.groupby("match_id_clean"):
        players = {}
        for user_id, player_df in match_df.groupby("user_id"):
            # Sort by timestamp
            player_df = player_df.sort_values("ts_ms")
            events = []
            for _, row in player_df.iterrows():
                event = {
                    "t": row["event_key"],
                    "px": int(row["px"]),
                    "py": int(row["py"]),
                    "ts": int(row["ts_ms"]),
                }
                events.append(event)

            players[str(user_id)] = {
                "b": bool(player_df.iloc[0]["is_bot"]),  # b for is_bot
                "e": events,  # e for events
            }

        # Match metadata
        human_count = sum(1 for p in players.values() if not p["b"])
        bot_count = sum(1 for p in players.values() if p["b"])
        duration_ms = int(match_df["match_duration_ms"].iloc[0])
        date = match_df["_date"].iloc[0]

        matches[match_id] = {
            "d": date,           # d for date
            "h": human_count,    # h for human count
            "bc": bot_count,     # bc for bot count
            "dur": duration_ms,  # dur for duration
            "p": players,        # p for players
        }

    return {
        "map_id": map_id,
        "matches": matches,
    }


def build_metadata(df: pd.DataFrame) -> dict:
    """Build the metadata.json with match list and global stats."""
    matches_list = []
    for match_id, match_df in df.groupby("match_id_clean"):
        map_id = match_df["map_id"].iloc[0]
        date = match_df["_date"].iloc[0]
        human_count = match_df[~match_df["is_bot"]]["user_id"].nunique()
        bot_count = match_df[match_df["is_bot"]]["user_id"].nunique()
        total_events = len(match_df)
        duration_ms = int(match_df["match_duration_ms"].iloc[0])

        # Count specific events
        event_counts = match_df["event_str"].value_counts().to_dict()

        matches_list.append({
            "id": match_id,
            "map": map_id,
            "date": date,
            "h": human_count,
            "bc": bot_count,
            "events": total_events,
            "dur": duration_ms,
            "kills": event_counts.get("Kill", 0) + event_counts.get("BotKill", 0),
            "deaths": event_counts.get("Killed", 0) + event_counts.get("BotKilled", 0) + event_counts.get("KilledByStorm", 0),
            "loots": event_counts.get("Loot", 0),
        })

    # Sort by date then by human count (most interesting first)
    matches_list.sort(key=lambda m: (m["date"], -m["h"]))

    # Per-map stats
    map_stats = {}
    for map_id, cfg in MAP_CONFIG.items():
        map_matches = [m for m in matches_list if m["map"] == map_id]
        map_stats[map_id] = {
            "match_count": len(map_matches),
            "minimap": f"/minimaps/{cfg['minimap_out']}",
        }

    return {
        "total_files": int(df["_source_file"].nunique()),
        "total_events": len(df),
        "unique_players": int(df[~df["is_bot"]]["user_id"].nunique()),
        "unique_bots": int(df[df["is_bot"]]["user_id"].nunique()),
        "unique_matches": int(df["match_id_clean"].nunique()),
        "dates": DATE_FOLDERS,
        "partial_dates": PARTIAL_DATES,
        "maps": map_stats,
        "matches": matches_list,
        "event_key_legend": {v: k for k, v in EVENT_SHORT.items()},
    }


def optimize_minimaps(input_dir: str, output_dir: str):
    """Convert minimap images to 1024x1024 WebP for fast web delivery."""
    if not HAS_PILLOW:
        print("\n[SKIP] Minimap optimization (Pillow not installed)")
        return

    minimaps_src = os.path.join(input_dir, "minimaps")
    minimaps_out = os.path.join(output_dir, "..", "minimaps")
    os.makedirs(minimaps_out, exist_ok=True)

    print("\nOptimizing minimaps:")
    for map_id, cfg in MAP_CONFIG.items():
        src_path = os.path.join(minimaps_src, cfg["minimap_src"])
        out_path = os.path.join(minimaps_out, cfg["minimap_out"])

        if not os.path.exists(src_path):
            print(f"  [SKIP] {cfg['minimap_src']} not found")
            continue

        img = Image.open(src_path)
        original_size = os.path.getsize(src_path)

        # Resize to 1024x1024 and convert to WebP
        img = img.resize((1024, 1024), Image.LANCZOS)
        img.save(out_path, "WEBP", quality=85)

        new_size = os.path.getsize(out_path)
        reduction = (1 - new_size / original_size) * 100
        print(f"  {cfg['minimap_src']:30s} -> {cfg['minimap_out']:30s}  "
              f"({original_size/1024/1024:.1f}MB -> {new_size/1024:.0f}KB, "
              f"{reduction:.0f}% smaller)")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LILA Pathfinder Data Preprocessor")
    parser.add_argument("--input", default="./player_data", help="Path to player_data directory")
    parser.add_argument("--output", default="./public/data", help="Output directory for JSON files")
    args = parser.parse_args()

    input_dir = args.input
    output_dir = args.output

    print("=" * 70)
    print("LILA PATHFINDER - PREPROCESSING PIPELINE")
    print("=" * 70)

    start_time = time.time()

    # ─── Step 1: Load all files ───────────────────────────────────────────────
    print("\n[1/6] Loading parquet files...")
    all_frames, load_stats = load_all_files(input_dir)

    if not all_frames:
        print("[ERROR] No data loaded. Check input path.")
        sys.exit(1)

    print(f"\n  Total files loaded: {load_stats['files_read']}")

    # ─── Step 2: Combine and transform ────────────────────────────────────────
    print("\n[2/6] Combining and transforming data...")
    df = pd.concat(all_frames, ignore_index=True)
    print(f"  Total raw events: {len(df)}")

    df = process_dataframe_vectorized(df)
    print(f"  Events after transformation: {len(df)}")
    print(f"  Event types found: {sorted(df['event_str'].unique())}")

    # ─── Step 3: Compute match-level timestamps ──────────────────────────────
    print("\n[3/6] Computing match-level relative timestamps...")
    df = compute_match_relative_timestamps(df)

    # Report match duration stats
    match_durations = df.groupby("match_id_clean")["match_duration_ms"].first()
    print(f"  Match duration stats:")
    print(f"    Min:    {match_durations.min()/1000:.1f}s")
    print(f"    Median: {match_durations.median()/1000:.1f}s")
    print(f"    Max:    {match_durations.max()/1000:.1f}s")
    print(f"    Mean:   {match_durations.mean()/1000:.1f}s")

    # ─── Step 4: Build JSON output ────────────────────────────────────────────
    print("\n[4/6] Building JSON output files...")
    os.makedirs(output_dir, exist_ok=True)

    for map_id, cfg in MAP_CONFIG.items():
        map_json = build_map_json(df, map_id)
        out_path = os.path.join(output_dir, f"{cfg['json_key']}.json")

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(map_json, f, separators=(",", ":"))  # Compact JSON

        file_size = os.path.getsize(out_path)
        match_count = len(map_json["matches"])
        print(f"  {cfg['json_key']}.json: {match_count} matches, "
              f"{file_size/1024/1024:.2f} MB")

    # ─── Step 5: Build metadata ───────────────────────────────────────────────
    print("\n[5/6] Building metadata.json...")
    metadata = build_metadata(df)
    meta_path = os.path.join(output_dir, "metadata.json")

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    meta_size = os.path.getsize(meta_path)
    print(f"  metadata.json: {meta_size/1024:.1f} KB")

    # ─── Step 6: Optimize minimaps ────────────────────────────────────────────
    print("\n[6/6] Optimizing minimaps...")
    optimize_minimaps(input_dir, output_dir)

    # ─── Summary ──────────────────────────────────────────────────────────────
    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("PREPROCESSING COMPLETE")
    print("=" * 70)
    print(f"\n  Time elapsed: {elapsed:.1f}s")
    print(f"\n  Data summary:")
    print(f"    Total files processed:  {load_stats['files_read']}")
    print(f"    Total events:           {len(df)}")
    print(f"    Unique human players:   {df[~df['is_bot']]['user_id'].nunique()}")
    print(f"    Unique bots:            {df[df['is_bot']]['user_id'].nunique()}")
    print(f"    Unique matches:         {df['match_id_clean'].nunique()}")

    print(f"\n  Per-map breakdown:")
    for map_id in MAP_CONFIG:
        map_df = df[df["map_id"] == map_id]
        if len(map_df) == 0:
            print(f"    {map_id}: No events")
            continue
        matches = map_df["match_id_clean"].nunique()
        humans = map_df[~map_df["is_bot"]]["user_id"].nunique()
        events = len(map_df)
        print(f"    {map_id:20s}: {matches:4d} matches, {humans:4d} humans, {events:6d} events")

    print(f"\n  Event distribution:")
    event_counts = df["event_str"].value_counts()
    for evt, count in event_counts.items():
        pct = count / len(df) * 100
        print(f"    {evt:20s}: {count:6d} ({pct:.1f}%)")

    print(f"\n  Output files:")
    for f in os.listdir(output_dir):
        fpath = os.path.join(output_dir, f)
        size = os.path.getsize(fpath)
        if size > 1024 * 1024:
            print(f"    {f:30s}: {size/1024/1024:.2f} MB")
        else:
            print(f"    {f:30s}: {size/1024:.1f} KB")

    print(f"\n  Pipeline finished successfully!")
    print(f"  Next: run 'npm run dev' to start the frontend.\n")


if __name__ == "__main__":
    main()
