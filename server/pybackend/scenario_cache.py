from collections import OrderedDict
import time
from typing import Dict, Optional, List, Tuple
import networkx as nx

class ScenarioCache:
    def __init__(
        self,
        max_global: int = 200,
        max_per_user: int = 8
    ):
        self.max_global = max_global
        self.max_per_user = max_per_user
        self.cache: OrderedDict[str, dict] = OrderedDict()          # key = "uid:scen_id"
        self.user_counts: Dict[str, int] = {}                       # uid → conteggio

    def _key(self, uid: str, scen_id: str) -> str:
        return f"{uid}:{scen_id}"

    def _get_user_scenarios(self, uid: str) -> List[Tuple[str, dict]]:
        """Ritorna lista di (key, state) per quell'utente, ordinata per last_access crescente (più vecchi prima)"""
        user_items = [
            (k, v) for k, v in self.cache.items()
            if k.startswith(f"{uid}:")
        ]
        # Ordina per last_access ASC → i più vecchi prima
        user_items.sort(key=lambda x: x[1]["last_access"])
        return user_items

    def _evict_half_for_user(self, uid: str):
        """Elimina il 50% degli scenari più vecchi per questo utente"""
        user_scenarios = self._get_user_scenarios(uid)
        if not user_scenarios:
            return

        count = len(user_scenarios)
        if count <= self.max_per_user:
            return  # non serve espellere

        to_remove_count = count // 2  # 50% arrotondato per difetto
        if to_remove_count < 1:
            to_remove_count = 1  # almeno uno

        to_remove_keys = [key for key, _ in user_scenarios[:to_remove_count]]

        for key in to_remove_keys:
            del self.cache[key]

        # Aggiorna contatore
        self.user_counts[uid] = max(0, count - to_remove_count)

        print(f"[Cache] Evicted {to_remove_count} old scenarios for user {uid}. Remaining: {self.user_counts[uid]}")

    def get(self, uid: str, scen_id: str) -> Optional[dict]:
        key = self._key(uid, scen_id)
        if key not in self.cache:
            return None
        self.cache[key]["last_access"]=time.time()
        self.cache.move_to_end(key)  # LRU touch
        return self.cache[key]

    def put(
        self,
        uid: str,
        scen_id: str,
        graph: nx.Graph,
        closed_segments: list,
        alfa: float,
        manual_weights: dict
    ) -> bool:
        key = self._key(uid, scen_id)
        state = {
                "graph": graph,
                "closed_segments": list(closed_segments) if closed_segments else [],
                "alfa": alfa or 0.5,
                "manual_weights": dict(manual_weights) if manual_weights else [],
                "last_access": time.time(),
                "uid": uid,
                "scen_id": scen_id
        }
        # Se già esiste → aggiorna senza controlli
        if key in self.cache:
            self.cache[key] = state
            self.cache.move_to_end(key)
            return True

        # Controllo limite per utente
        current_count = self.user_counts.get(uid, 0)
        if current_count >= self.max_per_user:
            # Elimina il 50% più vecchi
            self._evict_half_for_user(uid)
            # Ricalcola dopo espulsione
            current_count = self.user_counts.get(uid, 0)

        # Controllo globale (dopo eventuale pulizia utente)
        if len(self.cache) >= self.max_global:
            # LRU globale: rimuove il meno recente overall
            old_key, old_state = self.cache.popitem(last=False)
            old_uid = old_state["uid"]
            self.user_counts[old_uid] = max(0, self.user_counts.get(old_uid, 0) - 1)

        self.cache[key] = state
        self.cache.move_to_end(key)

        self.user_counts[uid] = self.user_counts.get(uid, 0) + 1

        return True

    def invalidate(self, uid: str, scen_id: str) -> bool:
        key = self._key(uid, scen_id)
        if key in self.cache:
            del self.cache[key]
            self.user_counts[uid] = max(0, self.user_counts.get(uid, 0) - 1)
            return True
        return False

    def update(self, uid: str, scen_id: str, stateUpdate: Dict[str, any]) -> bool:
        state = self.get(uid, scen_id)
        if state:
            state.update(stateUpdate)
            return True
        return False
    
    def stats(self) -> dict:
        return {
            "total_cached": len(self.cache),
            "users": len(self.user_counts),
            "per_user": {uid: cnt for uid, cnt in self.user_counts.items() if cnt > 0}
        }
    
    def has_capacity(self, user_id: str) -> bool:
        user_cap = self.max_per_user - self.user_counts.get(user_id, 0)
        all_cap = self.max_global - len(self.cache)

        return user_cap and all_cap