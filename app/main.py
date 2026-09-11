from fastapi import FastAPI
from app.database import Base, engine
from app.routers.users import router as users_roter

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users_roter)

@app.get("/about_us")
def about_us():
    return {"message": "About us"}

