from fastapi import APIRouter

router = APIRouter()

@router.get("/summary")
def get_analytics_summary():
    return {
        "total_survivors": 27,
        "critical_cases": 6,
        "active_hazards": 19
    }
