# Minimal CORS + preflight middleware for the mobile app's API.
#
# Why this exists: when the patient app runs on web (expo start --web), the
# browser loads it from http://localhost:8081 but the API lives on
# http://localhost:8000 — a different origin. Browsers block cross-origin
# requests unless the server returns Access-Control-Allow-* headers and answers
# the OPTIONS preflight. We can't pip-install django-cors-headers offline, so
# this small middleware does just enough for /api/ in development.
#
# It ONLY touches /api/ paths and is intended for the dev server. In production
# you'd use django-cors-headers with a locked-down allowlist.
from django.http import HttpResponse


class ApiCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/"):
            # Answer preflight immediately.
            if request.method == "OPTIONS":
                resp = HttpResponse(status=204)
                self._apply(request, resp)
                return resp
            resp = self.get_response(request)
            self._apply(request, resp)
            return resp
        return self.get_response(request)

    @staticmethod
    def _apply(request, resp):
        origin = request.headers.get("Origin", "*")
        resp["Access-Control-Allow-Origin"] = origin
        resp["Access-Control-Allow-Credentials"] = "true"
        resp["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        resp["Access-Control-Allow-Headers"] = (
            request.headers.get("Access-Control-Request-Headers")
            or "Content-Type, Authorization"
        )
        resp["Access-Control-Max-Age"] = "86400"
