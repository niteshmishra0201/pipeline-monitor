from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError


class AppException(Exception):
    """
    Base exception for all application-level errors.
    Raise this anywhere in your service layer.
    """
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


async def app_exception_handler(
    request: Request,
    exc: AppException
):
    """
    Handles all AppException instances raised anywhere in the app.
    Returns a consistent JSON error response.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "detail": exc.detail,
            "path": str(request.url)
        }
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    """
    Handles Pydantic validation errors.
    When a request body doesn't match the schema, this runs.
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(e) for e in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "detail": "Validation failed",
            "errors": errors,
            "path": str(request.url)
        }
    )


async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError
):
    """
    Handles database errors.
    Never exposes raw SQL errors to the client.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "detail": "A database error occurred",
            "path": str(request.url)
        }
    )


async def global_exception_handler(
    request: Request,
    exc: Exception
):
    """
    Catches absolutely anything that slips through.
    Last line of defense.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "detail": "An unexpected error occurred",
            "path": str(request.url)
        }
    )