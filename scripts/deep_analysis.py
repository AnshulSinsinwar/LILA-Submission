"""Deep analysis for PM-grade insights: extraction signals, loot-traffic comparison, map zone analysis"""
import json
import math

# Load all map data
maps = {}
for name in ['ambrose_valley', 'grand_rift', 'lockdown']:
    with open(f'public/data/{name}.json') as f:
        maps[name] = json.load(f)

with open('public/data/metadata.json') as f:
    meta = json.load(f)

print("=" * 60)
print("1. EXTRACTION SIGNAL ANALYSIS")
print("=" * 60)
print()

# Check if any events suggest extraction behavior
# In extraction shooters, extraction points are at map edges
# Look for Position events near map borders at END of match

for map_name, data in maps.items():
    edge_players = 0
    center_deaths = 0
    storm_deaths = 0
    total_players = 0
    total_matches = len(data['matches'])
    
    # Track where players' LAST event is (edge = possible extraction)
    last_positions = []
    
    for mid, match in data['matches'].items():
        for uid, player in match['p'].items():
            total_players += 1
            events = player['e']
            if not events:
                continue
            
            # Get last event
            last_event = events[-1]
            last_type = last_event['t']
            
            # Get last position event
            pos_events = [e for e in events if e['t'] in ('P', 'BP')]
            if pos_events:
                last_pos = pos_events[-1]
                px, py = last_pos['px'], last_pos['py']
                # Check if near edge (within 80px of border on 1024x1024 map)
                near_edge = px < 80 or px > 944 or py < 80 or py > 944
                if near_edge:
                    edge_players += 1
                last_positions.append((px, py, last_type, near_edge))
            
            # Check death events
            death_events = [e for e in events if e['t'] in ('D', 'BD', 'S')]
            if death_events:
                for de in death_events:
                    if de['t'] == 'S':
                        storm_deaths += 1
                    else:
                        center_deaths += 1
    
    edge_pct = (edge_players / total_players * 100) if total_players > 0 else 0
    print(f"\n--- {data['map_id']} ({total_matches} matches, {total_players} players) ---")
    print(f"  Players whose last position is near map edge: {edge_players} ({edge_pct:.1f}%)")
    print(f"  Storm deaths: {storm_deaths}")
    print(f"  Combat deaths: {center_deaths}")
    print(f"  Players with no death event (survived/extracted?): {total_players - center_deaths - storm_deaths}")

print()
print("=" * 60)
print("2. LOOT vs TRAFFIC ZONE ANALYSIS")
print("=" * 60)
print()

# Divide map into quadrants and compare traffic vs loot density
for map_name, data in maps.items():
    quadrants = {
        'NW': {'traffic': 0, 'loot': 0, 'kills': 0},
        'NE': {'traffic': 0, 'loot': 0, 'kills': 0},
        'SW': {'traffic': 0, 'loot': 0, 'kills': 0},
        'SE': {'traffic': 0, 'loot': 0, 'kills': 0},
    }
    
    total_traffic = 0
    total_loot = 0
    total_kills = 0
    
    for mid, match in data['matches'].items():
        for uid, player in match['p'].items():
            for event in player['e']:
                px, py = event.get('px', 512), event.get('py', 512)
                q = ('N' if py < 512 else 'S') + ('W' if px < 512 else 'E')
                
                if event['t'] in ('P', 'BP'):
                    quadrants[q]['traffic'] += 1
                    total_traffic += 1
                elif event['t'] == 'L':
                    quadrants[q]['loot'] += 1
                    total_loot += 1
                elif event['t'] in ('K', 'D', 'BK', 'BD'):
                    quadrants[q]['kills'] += 1
                    total_kills += 1
    
    print(f"\n--- {data['map_id']} ---")
    print(f"  {'Quadrant':<10} {'Traffic%':<12} {'Loot%':<12} {'Kill%':<12} {'Traffic/Loot Gap'}")
    for q in ['NW', 'NE', 'SW', 'SE']:
        t_pct = quadrants[q]['traffic'] / total_traffic * 100 if total_traffic else 0
        l_pct = quadrants[q]['loot'] / total_loot * 100 if total_loot else 0
        k_pct = quadrants[q]['kills'] / total_kills * 100 if total_kills else 0
        gap = t_pct - l_pct
        marker = "⚠ DEAD ZONE" if gap > 10 else ("💎 UNDEREXPLORED" if gap < -10 else "")
        print(f"  {q:<10} {t_pct:<12.1f} {l_pct:<12.1f} {k_pct:<12.1f} {gap:+.1f} {marker}")

print()
print("=" * 60)
print("3. PvP CONTEXT — WHERE DID THE 6 PvP EVENTS HAPPEN?")
print("=" * 60)

pvp_events = []
for map_name, data in maps.items():
    for mid, match in data['matches'].items():
        for uid, player in match['p'].items():
            for event in player['e']:
                if event['t'] in ('K', 'D'):
                    pvp_events.append({
                        'map': data['map_id'],
                        'match': mid[:8],
                        'player': uid[:8],
                        'type': event['t'],
                        'px': event['px'],
                        'py': event['py'],
                        'ts': event['ts'],
                        'is_bot': player['b']
                    })

print(f"\nAll {len(pvp_events)} PvP Kill/Killed events:")
for e in pvp_events:
    print(f"  [{e['map']}] match:{e['match']}... player:{e['player']}... t={e['type']} pos=({e['px']},{e['py']}) ts={e['ts']}ms bot={e['is_bot']}")

print()
print("=" * 60)
print("4. MATCH COMPOSITION ANALYSIS")
print("=" * 60)

# How many humans per match on average?
for map_name, data in maps.items():
    human_counts = []
    bot_counts = []
    for mid, match in data['matches'].items():
        human_counts.append(match['h'])
        bot_counts.append(match['bc'])
    
    avg_h = sum(human_counts) / len(human_counts)
    avg_b = sum(bot_counts) / len(bot_counts)
    solo_pct = sum(1 for h in human_counts if h == 1) / len(human_counts) * 100
    print(f"\n--- {data['map_id']} ---")
    print(f"  Avg humans/match: {avg_h:.2f}")
    print(f"  Avg bots/match: {avg_b:.2f}")
    print(f"  Solo matches (1 human): {solo_pct:.1f}%")
    print(f"  Human:Bot ratio: 1:{avg_b/avg_h:.1f}")

print()
print("=" * 60)
print("5. STORM DEATH LOCATIONS")
print("=" * 60)

storm_events = []
for map_name, data in maps.items():
    for mid, match in data['matches'].items():
        for uid, player in match['p'].items():
            for event in player['e']:
                if event['t'] == 'S':
                    storm_events.append({
                        'map': data['map_id'],
                        'px': event['px'],
                        'py': event['py'],
                    })

print(f"\nTotal storm deaths: {len(storm_events)}")
for e in storm_events[:15]:
    print(f"  [{e['map']}] pos=({e['px']},{e['py']})")
