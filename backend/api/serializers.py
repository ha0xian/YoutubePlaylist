from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from rest_framework.validators import UniqueValidator

User = get_user_model()

# Module-level cached dummy hash for timing-attack mitigation on email login
_DUMMY_HASH = None


def _get_dummy_hash():
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = make_password("dummy-timing-attack-guard")
    return _DUMMY_HASH


class UserSerializer(serializers.ModelSerializer):
    uuid = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "uuid", "username", "email"]

    def get_uuid(self, obj):
        return str(obj.profile.uuid)


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150,
        validators=[UniqueValidator(User.objects.all())],
    )
    email = serializers.EmailField(
        validators=[UniqueValidator(User.objects.all())],
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        # UserProfile is auto-created by the post_save signal
        token = Token.objects.create(user=user)
        return {
            "token": token.key,
            "user": user,
        }


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        username = attrs.get("username")
        email = attrs.get("email")
        password = attrs.get("password")

        if not username and not email:
            raise serializers.ValidationError(
                "At least one of username or email must be provided."
            )

        user = None

        if username:
            user = authenticate(request=None, username=username, password=password)
        elif email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Perform dummy password check to prevent timing attacks
                check_password(password, _get_dummy_hash())
                raise serializers.ValidationError(
                    {"detail": "Unable to log in with provided credentials."}
                )
            if not user.check_password(password):
                user = None

        if user is None:
            raise serializers.ValidationError(
                {"detail": "Unable to log in with provided credentials."}
            )

        token, created = Token.objects.get_or_create(user=user)
        return {
            "token": token.key,
            "user": user,
        }
