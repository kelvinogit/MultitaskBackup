from django.db import models

# Create your models here.

class Curso(models.Model):
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=150)

    def __str__(self):
        return self.nome