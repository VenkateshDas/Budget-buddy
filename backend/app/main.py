"""
FastAPI main application
Budget Buddy - Receipt Processing and Budget Management API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.api.routes import receipts_router, analysis_router, budgets_router
from app.api.routes.users import router as users_router
from app.api.routes.sheets import router as sheets_router

settings = get_settings()

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    description="Receipt processing and budget management API powered by Gemini AI",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(receipts_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(budgets_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(sheets_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return JSONResponse(
        content={
            "message": "Budget Buddy API",
            "version": "1.0.0",
            "docs": "/docs",
            "status": "running",
        }
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(content={"status": "healthy"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
