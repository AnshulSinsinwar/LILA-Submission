"""
LILA Pathfinder — Data Exploration & Assumption Validation
Run this BEFORE building the preprocessing pipeline.

Validates:
1. Bytes decoding → clean event strings
2. Bot detection (UUID vs numeric user_id)
3. Coordinate mapping formula → pixel positions on minimap
4. match_id normalization (.nakama-0 suffix)
5. Data shape & distribution stats
"""

import pyarrow.parquet as pq
import pandas as pd
import os
import re
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "player_data")

MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift":     {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown":      {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

# ─── Load a sample of files ───────────────────────────────────────────────────

def load_day(folder_path, max_files=50):
    """Load up to max_files parquet files from a day folder."""
    frames = []
    files_loaded = 0
    errors = []
    for f in os.listdir(folder_path):
        if f.startswith('.'):
            continue
        filepath = os.path.join(folder_path, f)
        try:
            t = pq.read_table(filepath)
            df = t.to_pandas()
            df['_source_file'] = f
            frames.append(df)
            files_loaded += 1
            if files_loaded >= max_files:
                break
        except Exception as e:
            errors.append((f, str(e)))
    if errors:
        print(f"  ⚠️  {len(errors)} files failed to read:")
        for fn, err in errors[:3]:
            print(f"      {fn}: {err}")
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

print("=" * 70)
print("LILA PATHFINDER — DATA EXPLORATION & VALIDATION")
print("=" * 70)

# Load Feb 10 sample (has the most files)
feb10_path = os.path.join(DATA_DIR, "February_10")
print(f"\n📂 Loading sample from February_10 (up to 50 files)...")
df = load_day(feb10_path, max_files=50)
print(f"   Loaded {len(df)} events from {df['_source_file'].nunique()} files")

# ─── TEST 1: Bytes Decoding ──────────────────────────────────────────────────

print("\n" + "─" * 70)
print("TEST 1: EVENT COLUMN — BYTES DECODING")
print("─" * 70)

print(f"\n   Raw event dtype: {df['event'].dtype}")
print(f"   Sample raw values: {df['event'].head(3).tolist()}")

# Decode
df['event_str'] = df['event'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else str(x))

unique_events = sorted(df['event_str'].unique())
print(f"\n   ✅ Unique event types ({len(unique_events)}): {unique_events}")

event_counts = df['event_str'].value_counts()
print(f"\n   Event distribution:")
for evt, count in event_counts.items():
    pct = count / len(df) * 100
    print(f"      {evt:20s} {count:6d}  ({pct:.1f}%)")

# ─── TEST 2: Bot Detection ───────────────────────────────────────────────────

print("\n" + "─" * 70)
print("TEST 2: BOT vs HUMAN DETECTION (user_id format)")
print("─" * 70)

df['is_human'] = df['user_id'].apply(lambda x: bool(UUID_PATTERN.match(str(x))))
df['is_bot'] = ~df['is_human']

humans = df[df['is_human']]['user_id'].nunique()
bots = df[df['is_bot']]['user_id'].nunique()
print(f"\n   Unique human players (UUID): {humans}")
print(f"   Unique bots (numeric):       {bots}")

# Verify: bot events should be BotPosition/BotKill/BotKilled
bot_events = df[df['is_bot']]['event_str'].unique()
human_events = df[df['is_human']]['event_str'].unique()
print(f"\n   Bot event types:   {sorted(bot_events)}")
print(f"   Human event types: {sorted(human_events)}")

# Cross-check: do bots ever have non-Bot events?
bot_non_bot_events = df[df['is_bot'] & ~df['event_str'].str.startswith('Bot')]
if len(bot_non_bot_events) > 0:
    print(f"\n   ⚠️  {len(bot_non_bot_events)} bot rows have non-Bot event types:")
    print(f"       {bot_non_bot_events['event_str'].value_counts().to_dict()}")
else:
    print(f"\n   ✅ All bot events are prefixed with 'Bot' — classification confirmed")

# Cross-check: do humans ever have Bot events?
human_bot_events = df[df['is_human'] & df['event_str'].str.startswith('Bot')]
if len(human_bot_events) > 0:
    print(f"   ⚠️  {len(human_bot_events)} human rows have Bot event types")
else:
    print(f"   ✅ No humans have Bot-prefixed events — clean separation")

# Sample bot user_ids
print(f"\n   Sample bot user_ids: {df[df['is_bot']]['user_id'].unique()[:5].tolist()}")
print(f"   Sample human user_ids: {df[df['is_human']]['user_id'].unique()[:3].tolist()}")

# ─── TEST 3: Coordinate Mapping ──────────────────────────────────────────────

print("\n" + "─" * 70)
print("TEST 3: COORDINATE MAPPING — WORLD → PIXEL")
print("─" * 70)

# First, verify the README example
print("\n   📐 README Example Verification (AmbroseValley):")
print("      World: x=-301.45, z=-355.55")
cfg = MAP_CONFIG["AmbroseValley"]
u = (-301.45 - cfg['origin_x']) / cfg['scale']
v = (-355.55 - cfg['origin_z']) / cfg['scale']
px = round(u * 1024)
py = round((1 - v) * 1024)
print(f"      u={u:.4f}, v={v:.4f}")
print(f"      pixel_x={px}, pixel_y={py}")
print(f"      Expected: px=78, py=890")
print(f"      {'✅ MATCH' if px == 78 and py == 890 else '❌ MISMATCH'}")

# Now compute for all events in our sample
print(f"\n   📐 Computing pixel coords for all {len(df)} events...")

for map_id, cfg in MAP_CONFIG.items():
    map_df = df[df['map_id'] == map_id]
    if len(map_df) == 0:
        print(f"\n      {map_id}: No events in sample")
        continue
    
    u = (map_df['x'] - cfg['origin_x']) / cfg['scale']
    v = (map_df['z'] - cfg['origin_z']) / cfg['scale']
    px = (u * 1024).round().astype(int)
    py = ((1 - v) * 1024).round().astype(int)
    
    # Check bounds
    out_of_bounds = ((px < 0) | (px > 1023) | (py < 0) | (py > 1023)).sum()
    total = len(map_df)
    
    print(f"\n      {map_id} ({total} events):")
    print(f"         px range: [{px.min()}, {px.max()}]")
    print(f"         py range: [{py.min()}, {py.max()}]")
    print(f"         Out of bounds: {out_of_bounds}/{total} ({out_of_bounds/total*100:.1f}%)")
    
    if out_of_bounds > 0:
        oob_pct = out_of_bounds / total * 100
        if oob_pct > 5:
            print(f"         ⚠️  High OOB rate — coordinate config may be wrong")
        else:
            print(f"         ℹ️  Minor OOB — edge events, will clamp to [0, 1023]")

# ─── TEST 4: match_id Normalization ───────────────────────────────────────────

print("\n" + "─" * 70)
print("TEST 4: MATCH_ID NORMALIZATION")
print("─" * 70)

match_ids = df['match_id'].unique()
has_suffix = sum(1 for m in match_ids if '.nakama-0' in str(m))
print(f"\n   Total unique match_ids in sample: {len(match_ids)}")
print(f"   With .nakama-0 suffix: {has_suffix}/{len(match_ids)}")
print(f"   Sample match_ids:")
for mid in match_ids[:3]:
    clean = str(mid).replace('.nakama-0', '')
    print(f"      Raw:   {mid}")
    print(f"      Clean: {clean}")

# Also check: does filename match_id match data match_id?
sample_file = df['_source_file'].iloc[0]
file_match_id = sample_file.split('_', 1)[1] if '_' in sample_file else ''
data_match_id = df[df['_source_file'] == sample_file]['match_id'].iloc[0]
print(f"\n   Filename-vs-data check:")
print(f"      File:        {sample_file}")
print(f"      File match:  {file_match_id}")
print(f"      Data match:  {data_match_id}")
print(f"      {'✅ Consistent' if file_match_id == str(data_match_id) else '⚠️  Different format — check normalization'}")

# ─── TEST 5: Overall Data Stats ──────────────────────────────────────────────

print("\n" + "─" * 70)
print("TEST 5: DATA SHAPE & DISTRIBUTION")
print("─" * 70)

# Count files per day
print("\n   📊 Files per day:")
for day in ["February_10", "February_11", "February_12", "February_13", "February_14"]:
    day_path = os.path.join(DATA_DIR, day)
    if os.path.exists(day_path):
        count = len([f for f in os.listdir(day_path) if not f.startswith('.')])
        print(f"      {day}: {count} files")

# Map distribution in sample
print(f"\n   📊 Map distribution (in sample):")
map_counts = df['map_id'].value_counts()
for map_id, count in map_counts.items():
    print(f"      {map_id}: {count} events ({count/len(df)*100:.1f}%)")

# Timestamp analysis
print(f"\n   📊 Timestamp analysis:")
print(f"      dtype: {df['ts'].dtype}")
print(f"      min: {df['ts'].min()}")
print(f"      max: {df['ts'].max()}")

# Per-match timestamp range
for mid in match_ids[:3]:
    match_df = df[df['match_id'] == mid]
    ts_range = match_df['ts'].max() - match_df['ts'].min()
    print(f"      Match {str(mid)[:8]}... duration: {ts_range}")

# Column types
print(f"\n   📊 Column dtypes:")
for col in df.columns:
    if col != '_source_file':
        print(f"      {col:15s} {str(df[col].dtype):20s} sample: {df[col].iloc[0]}")

# ─── TEST 6: Y-axis (elevation) check ────────────────────────────────────────

print("\n" + "─" * 70)
print("TEST 6: Y-AXIS (ELEVATION) ANALYSIS")
print("─" * 70)

print(f"\n   y (elevation) range: [{df['y'].min():.2f}, {df['y'].max():.2f}]")
print(f"   y mean: {df['y'].mean():.2f}, std: {df['y'].std():.2f}")
print(f"   ℹ️  Confirming y is elevation, not map coordinate (wide range = 3D height)")

# ─── SUMMARY ──────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("VALIDATION SUMMARY")
print("=" * 70)
print("""
✅ = Confirmed   ⚠️ = Needs attention   ❌ = Failed

Check the output above for each test result.
If all ✅, proceed to building preprocess.py with confidence.
""")
