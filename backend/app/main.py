from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    users_router, auth_router, events_router, deadline_router,
    catalog_router, schedule_router, sources_router,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(deadline_router)
app.include_router(catalog_router)
app.include_router(schedule_router)
app.include_router(sources_router)


@app.get("/about_us")
def about_us():
    return {"message": "About us"}


@app.get("/")
def health():
    return {"message": "ok"}
