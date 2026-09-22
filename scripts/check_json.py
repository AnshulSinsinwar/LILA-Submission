import json

# Check metadata
with open('public/data/metadata.json') as f:
    meta = json.load(f)
print('=== METADATA ===')
print(f'Total events: {meta["total_events"]}')
print(f'Unique players: {meta["unique_players"]}')
print(f'Unique bots: {meta["unique_bots"]}')
print(f'Unique matches: {meta["unique_matches"]}')
for map_id, info in meta['maps'].items():
    print(f'  {map_id}: {info["match_count"]} matches')
print(f'Event key legend: {meta["event_key_legend"]}')
print(f'Sample match: {json.dumps(meta["matches"][0], indent=2)}')

# Check a map JSON structure
print('\n=== AMBROSE VALLEY SAMPLE ===')
with open('public/data/ambrose_valley.json') as f:
    av = json.load(f)
print(f'Map: {av["map_id"]}')
print(f'Matches: {len(av["matches"])}')
first_mid = list(av['matches'].keys())[0]
first_match = av['matches'][first_mid]
print(f'First match: {first_mid}')
print(f'  Date: {first_match["d"]}')
print(f'  Humans: {first_match["h"]}, Bots: {first_match["bc"]}')
print(f'  Duration: {first_match["dur"]}ms')
print(f'  Players: {len(first_match["p"])}')
first_player = list(first_match['p'].keys())[0]
pdata = first_match['p'][first_player]
print(f'  First player: {first_player[:16]}...')
print(f'    is_bot: {pdata["b"]}')
print(f'    events: {len(pdata["e"])}')
print(f'    first 3 events:')
for ev in pdata['e'][:3]:
    print(f'      {ev}')
