from django.db import models


# Create your models here.

class Curso(models.Model):
    nome = models.CharField(max_length=150, unique=True)

    class Meta: 
       ordering = ['nome']

       def __str__(self):
           return self.nome


    
   

    




