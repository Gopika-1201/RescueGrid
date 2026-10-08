import math
import heapq
from typing import List, Dict, Any, Tuple, Optional

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class RiskAwarePathfinder:
    def __init__(self, grid_size: int = 35):
        self.grid_size = grid_size

    def plan_route(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        hazards: List[Dict[str, Any]],
        avoid_hazards: bool = True
    ) -> Dict[str, Any]:
        """
        Executes risk-aware A* pathfinding on a discretized bounding sector.
        Returns primary safe route and an alternative route with metrics.
        """
        # Determine bounding envelope with padding
        min_lat = min(start_lat, end_lat) - 0.005
        max_lat = max(start_lat, end_lat) + 0.005
        min_lng = min(start_lng, end_lng) - 0.005
        max_lng = max(start_lng, end_lng) + 0.005

        lat_step = (max_lat - min_lat) / self.grid_size
        lng_step = (max_lng - min_lng) / self.grid_size

        def to_grid(lat: float, lng: float) -> Tuple[int, int]:
            r = int(round((lat - min_lat) / lat_step))
            c = int(round((lng - min_lng) / lng_step))
            return max(0, min(self.grid_size, r)), max(0, min(self.grid_size, c))

        def to_coords(r: int, c: int) -> Tuple[float, float]:
            lat = min_lat + r * lat_step
            lng = min_lng + c * lng_step
            return round(lat, 6), round(lng, 6)

        start_node = to_grid(start_lat, start_lng)
        end_node = to_grid(end_lat, end_lng)

        # Precompute hazard cost field
        def get_cell_cost(r: int, c: int) -> Tuple[float, List[str], bool]:
            lat, lng = to_coords(r, c)
            additional_cost = 0.0
            nearby_hazard_ids = []
            is_critical_breach = False

            if avoid_hazards:
                for h in hazards:
                    h_lat = h.get("lat")
                    h_lng = h.get("lng")
                    if h_lat is None or h_lng is None:
                        continue
                    
                    h_radius = float(h.get("radius_meters") or 100.0)
                    h_sev = str(h.get("severity") or "HIGH").upper()
                    dist = haversine_distance_meters(lat, lng, h_lat, h_lng)

                    # Inside core hazard perimeter
                    if dist <= h_radius:
                        if h_sev == "CRITICAL":
                            additional_cost += 1000.0
                            is_critical_breach = True
                        elif h_sev == "HIGH":
                            additional_cost += 400.0
                        else:
                            additional_cost += 150.0
                        nearby_hazard_ids.append(h.get("id") or h.get("type", "Hazard"))
                    # In warning buffer zone (up to 2x radius)
                    elif dist <= h_radius * 2.0:
                        buffer_factor = (h_radius * 2.0 - dist) / h_radius
                        if h_sev == "CRITICAL":
                            additional_cost += 200.0 * buffer_factor
                        elif h_sev == "HIGH":
                            additional_cost += 80.0 * buffer_factor
                        else:
                            additional_cost += 30.0 * buffer_factor

            return additional_cost, nearby_hazard_ids, is_critical_breach

        # A* Search
        open_set: List[Tuple[float, float, Tuple[int, int]]] = []
        heapq.heappush(open_set, (0.0, 0.0, start_node))
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        g_score: Dict[Tuple[int, int], float] = {start_node: 0.0}

        def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> float:
            return math.hypot(a[0] - b[0], a[1] - b[1])

        found_path = False
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]

        while open_set:
            _, current_g, current = heapq.heappop(open_set)

            if current == end_node:
                found_path = True
                break

            for dr, dc in directions:
                nr, nc = current[0] + dr, current[1] + dc
                if not (0 <= nr <= self.grid_size and 0 <= nc <= self.grid_size):
                    continue

                neighbor = (nr, nc)
                cell_penalty, _, critical = get_cell_cost(nr, nc)
                
                # Base step cost (1.0 for orthogonal, 1.414 for diagonal)
                step_dist = 1.414 if (dr != 0 and dc != 0) else 1.0
                tentative_g = current_g + step_dist + cell_penalty

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score = tentative_g + heuristic(neighbor, end_node)
                    heapq.heappush(open_set, (f_score, tentative_g, neighbor))

        # Reconstruct path
        path_coords: List[List[float]] = []
        if found_path:
            curr = end_node
            rev_path = []
            while curr in came_from:
                rev_path.append(curr)
                curr = came_from[curr]
            rev_path.append(start_node)
            rev_path.reverse()

            # Ensure exact start and end coordinates
            path_coords = [[start_lat, start_lng]]
            for r, c in rev_path[1:-1]:
                clat, clng = to_coords(r, c)
                path_coords.append([clat, clng])
            path_coords.append([end_lat, end_lng])
        else:
            # Fallback direct path with waypoint
            mid_lat = (start_lat + end_lat) / 2.0 + 0.001
            mid_lng = (start_lng + end_lng) / 2.0 - 0.001
            path_coords = [
                [start_lat, start_lng],
                [round(mid_lat, 6), round(mid_lng, 6)],
                [end_lat, end_lng]
            ]

        # Calculate metrics for the primary route
        total_distance_m = 0.0
        for i in range(len(path_coords) - 1):
            p1 = path_coords[i]
            p2 = path_coords[i + 1]
            total_distance_m += haversine_distance_meters(p1[0], p1[1], p2[0], p2[1])

        dist_km = round(total_distance_m / 1000.0, 2)
        # Average off-road / emergency vehicle speed ~ 25 km/h
        eta_minutes = max(1, round((dist_km / 25.0) * 60.0))

        # Analyze hazard interactions
        encountered = set()
        avoided = set()
        max_proximity_risk = 0

        for h in hazards:
            h_lat = h.get("lat")
            h_lng = h.get("lng")
            if h_lat is None or h_lng is None:
                continue
            h_id = h.get("id") or h.get("type", "Hazard")
            h_radius = float(h.get("radius_meters") or 100.0)
            
            # Find minimum distance from route to this hazard
            min_dist_to_hazard = min(
                haversine_distance_meters(pt[0], pt[1], h_lat, h_lng)
                for pt in path_coords
            )

            if min_dist_to_hazard <= h_radius:
                encountered.add(h_id)
                max_proximity_risk += 35
            elif min_dist_to_hazard <= h_radius * 2.5:
                avoided.add(f"{h_id} (bypassed at {int(min_dist_to_hazard)}m)")
                max_proximity_risk += 10
            else:
                avoided.add(f"{h_id} (clear margin)")

        route_risk = min(100, max(5, max_proximity_risk + 10))
        is_safe = len(encountered) == 0

        # Generate Alternative Route (Direct Line with slight opposite curve)
        alt_mid_lat = (start_lat + end_lat) / 2.0 - 0.0015
        alt_mid_lng = (start_lng + end_lng) / 2.0 + 0.0015
        alt_path = [
            [start_lat, start_lng],
            [round(alt_mid_lat, 6), round(alt_mid_lng, 6)],
            [end_lat, end_lng]
        ]
        alt_dist_km = round((haversine_distance_meters(start_lat, start_lng, end_lat, end_lng) * 1.08) / 1000.0, 2)

        return {
            "route_id": f"ROUTE-{abs(hash((start_lat, end_lat))) % 10000:04d}",
            "is_safe": is_safe,
            "risk_score": route_risk,
            "risk_level": "LOW" if route_risk <= 25 else ("MODERATE" if route_risk <= 50 else "HIGH"),
            "distance_km": dist_km,
            "eta_minutes": eta_minutes,
            "coordinates": path_coords,
            "hazards_avoided": list(avoided)[:5],
            "hazards_encountered": list(encountered),
            "alternative_route": {
                "route_id": "ROUTE-ALT-02",
                "distance_km": alt_dist_km,
                "eta_minutes": max(1, round((alt_dist_km / 25.0) * 60.0)),
                "coordinates": alt_path,
                "risk_score": min(100, route_risk + 20),
                "is_safe": False
            }
        }

pathfinder = RiskAwarePathfinder()
