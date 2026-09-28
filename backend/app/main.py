from fastapi import FastAPI
from backend.app.database import Base, engine
from backend.app.routers import users_router, auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users_router)
app.include_router(auth_router)


@app.get("/about_us")
def about_us():
    return {"message": "About us"}


@app.get("/")
def health():
    return {"message": "ok"}
