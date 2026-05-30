from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegistrationSerializer, UserSerializer


@api_view(["GET"])
def api_root(request):
    return Response(
        {
            "message": "Hello from Django REST Framework!",
            "status": "ok",
        }
    )


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user_serializer = UserSerializer(result["user"])
        return Response(
            {
                "token": result["token"],
                "user": user_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            # Credential errors are non-field errors with a "detail" key.
            if isinstance(errors, dict) and "detail" in errors:
                detail = errors["detail"]
                # DRF wraps error values in lists; extract the first element.
                if isinstance(detail, (list, tuple)):
                    detail = detail[0] if detail else "Authentication failed"
                return Response(
                    {"detail": str(detail)},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.validated_data
        user_serializer = UserSerializer(result["user"])
        return Response(
            {
                "token": result["token"],
                "user": user_serializer.data,
            },
        )


class MeView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
