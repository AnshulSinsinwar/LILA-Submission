"""Check match durations - are they seconds or minutes?"""
import json

with open('public/data/ambrose_valley.json') as f:
    av = json.load(f)

print("=== MATCH DURATIONS (Ambrose Valley, first 20) ===")
print(f"{'#':<4} {'Match ID':<40} {'H':>2} {'B':>2} {'Dur(ms)':>10} {'Human':>6} {'Events':>7}")
for i, (mid, match) in enumerate(list(av['matches'].items())[:20]):
    dur_ms = match['dur']
    dur_label = f"{dur_ms}ms" if dur_ms < 1000 else f"{dur_ms/1000:.1f}s"
    total_events = sum(len(p['e']) for p in match['p'].values())
    print(f"{i+1:<4} {mid:<40} {match['h']:>2} {match['bc']:>2} {dur_ms:>10} {dur_label:>6} {total_events:>7}")

# Check the max timestamps across ALL events in a match
print("\n=== DETAILED TIMESTAMP ANALYSIS (3 largest matches) ===")
by_events = sorted(av['matches'].items(), key=lambda x: sum(len(p['e']) for p in x[1]['p'].values()), reverse=True)
for mid, match in by_events[:3]:
    all_ts = []
    for uid, player in match['p'].items():
        for e in player['e']:
            all_ts.append(e['ts'])
    total_events = sum(len(p['e']) for p in match['p'].values())
    print(f"\nMatch {mid[:16]}... ({match['h']}H {match['bc']}B, {total_events} events)")
    print(f"  ts range: {min(all_ts)}ms - {max(all_ts)}ms = {max(all_ts)-min(all_ts)}ms span")
    print(f"  dur field: {match['dur']}ms")
    print(f"  Players: {len(match['p'])}")
    for uid, player in match['p'].items():
        pts = [e['ts'] for e in player['e']]
        print(f"    {uid[:12]}... bot={player['b']} events={len(player['e'])} ts=[{min(pts)}-{max(pts)}]ms")
