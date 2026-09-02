from django.db import models


# Create your models here.

class Curso(models.Model):
    nome = models.CharField(max_length=150, unique=True)
    slug = models.CharField(max_length=150, unique=True)
    class Meta: 
       ordering = ['nome']

       def __str__(self):
           return self.nome

class Disciplina(models.Model):
    nome = models.CharField(max_length=150)
    professor = models.CharField(max_length=150, blank=True)
    semestre = models.CharField(max_length=20, blank=True)
    descricao = models.TextField(blank=True)
    usuario = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='disciplinas',
    )

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Atividade(models.Model):
    class Tipo(models.TextChoices):
        TRABALHO = 'trabalho', 'Trabalho'
        PROVA = 'prova', 'Prova'
        EXERCICIO = 'exercicio', 'Exercício'
        SEMINARIO = 'seminario', 'Seminário'
        PROJETO = 'projeto', 'Projeto'
        COMPLEMENTAR = 'complementar', 'Atividade complementar'
        OUTROS = 'outros', 'Outros'

    class Prioridade(models.TextChoices):
        BAIXA = 'baixa', 'Baixa'
        MEDIA = 'media', 'Média'
        ALTA = 'alta', 'Alta'

    class Status(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        ANDAMENTO = 'andamento', 'Em andamento'
        CONCLUIDA = 'concluida', 'Concluída'
        ATRASADA = 'atrasada', 'Atrasada'


    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.CASCADE,
        related_name='atividades',
    )

    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.OUTROS)
    prazo = models.DateTimeField()
    prioridade = models.CharField(max_length=10, choices=Prioridade.choices, default=Prioridade.MEDIA)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDENTE)
    observacoes = models.TextField(blank=True)
    usuario = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='atividades',
    )

    class Meta:
        ordering = ['prazo']

    def __str__(self):
        return self.titulo

    @property
    def esta_atrasada(self):
        from django.utils import timezone
        return self.status != self.Status.CONCLUIDA and self.prazo < timezone.now()


        

        
    

    
    
   

    




