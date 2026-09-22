"""Quick diagnostic on timestamp structure across match files."""
import pyarrow.parquet as pq
import pandas as pd
import os
import re

DATA_DIR = "./player_data/February_10"
UUID = re.compile(r'^[0-9a-f]{8}-', re.IGNORECASE)

# Pick a match with many files — find one
files_by_match = {}
for f in os.listdir(DATA_DIR):
    if f.startswith('.'): continue
    parts = f.rsplit('_', 1)
    if len(parts) == 2:
        match_part = parts[1]  # match_id.nakama-0
        files_by_match.setdefault(match_part, []).append(f)

# Sort by file count
sorted_matches = sorted(files_by_match.items(), key=lambda x: -len(x[1]))
print(f"Top 5 matches by file count:")
for mid, flist in sorted_matches[:5]:
    print(f"  {mid}: {len(flist)} files")

# Analyze the biggest match
best_match_id, best_files = sorted_matches[0]
print(f"\nAnalyzing match: {best_match_id} ({len(best_files)} files)")
print("-" * 60)

all_dfs = []
for f in best_files:
    df = pq.read_table(os.path.join(DATA_DIR, f)).to_pandas()
    uid = f.split('_')[0]
    is_bot = not bool(UUID.match(uid))
    df['_file'] = f
    df['_uid_short'] = uid[:8] if not is_bot else f"bot_{uid}"
    df['_is_bot'] = is_bot
    all_dfs.append(df)

match_df = pd.concat(all_dfs, ignore_index=True)

print(f"Total events in match: {len(match_df)}")
print(f"Players: {match_df['_uid_short'].nunique()}")
print(f"  Humans: {match_df[~match_df['_is_bot']]['_uid_short'].nunique()}")
print(f"  Bots:   {match_df[match_df['_is_bot']]['_uid_short'].nunique()}")

print(f"\nTimestamp analysis:")
print(f"  dtype: {match_df['ts'].dtype}")
print(f"  Global min: {match_df['ts'].min()}")
print(f"  Global max: {match_df['ts'].max()}")
print(f"  Range:      {match_df['ts'].max() - match_df['ts'].min()}")

# Convert to raw ms value to understand the epoch
ts_min = match_df['ts'].min()
ts_max = match_df['ts'].max()
print(f"\n  As epoch ms:")
print(f"    min ms: {int(ts_min.value / 1e6)}")
print(f"    max ms: {int(ts_max.value / 1e6)}")
print(f"    range ms: {int((ts_max.value - ts_min.value) / 1e6)}")

# Per-player timestamp ranges
print(f"\nPer-player timestamp ranges:")
for uid, player_df in match_df.groupby('_uid_short'):
    ts_range = player_df['ts'].max() - player_df['ts'].min()
    ts_range_ms = int((player_df['ts'].max().value - player_df['ts'].min().value) / 1e6)
    print(f"  {uid:20s}: {len(player_df):4d} events, range={ts_range_ms}ms ({ts_range_ms/1000:.1f}s)")

# Show raw timestamp values for first few events of first human
humans = match_df[~match_df['_is_bot']]
if len(humans) > 0:
    first_human = humans['_uid_short'].iloc[0]
    human_df = match_df[match_df['_uid_short'] == first_human].sort_values('ts').head(10)
    print(f"\nFirst 10 events for human {first_human}:")
    for _, row in human_df.iterrows():
        evt = row['event'].decode('utf-8') if isinstance(row['event'], bytes) else row['event']
        raw_ms = int(row['ts'].value / 1e6)
        print(f"  ts={raw_ms}ms  event={evt:15s}  x={row['x']:.1f} z={row['z']:.1f}")
