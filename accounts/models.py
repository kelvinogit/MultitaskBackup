from django.db import models
from django.contrib.auth.models import AbstractUser, PermissionsMixin, BaseUserManager
# Create your models here.


class UserManager(BaseUserManager):
    def create_user(self, email, nome , password=None, curso=None, **extra_fields):
        if not email:
            raise ValueError('e-mail obrigatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, curso=curso, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, nome, password, **extra_fields)

class User(AbstractUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=200)
    curso =  models.ForeignKey(
        'core.Curso',
        on_delete=models.PROTECT,
        null=True ,
        blank=True,
        related_name='usuarios'
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DataTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    def __str__(self):
        return self.email
