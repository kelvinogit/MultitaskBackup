from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

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
    
    media_final = models.DecimalField(
    max_digits=4,
    decimal_places=2,
    default= Decimal('7.00'),
    validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('10'))],
    verbose_name='Meta final (nota requerida)',
)

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Atividade(models.Model):
    class Tipo(models.TextChoices):
        TRABALHO = 'trabalho', 'Trabalho'
        EXERCICIO = 'exercicio', 'Exercício'
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

    modulo_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'

    )
    modulo_object_id = models.PositiveIntegerField(null=True, blank=True)
    modulo_objeto = GenericForeignKey('modulo_content_type', 'modulo_object_id')

    

    class Meta:
        ordering = ['prazo']

    def __str__(self):
        return self.titulo

    @property
    def esta_atrasada(self):
        from django.utils import timezone
        return self.status != self.Status.CONCLUIDA and self.prazo < timezone.now()

    def sincronizar_status_atraso(self, salvar=True):

        if self.esta_atrasada and self.status != self.Status.ATRASADA:
            self.status = self.Status.ATRASADA
            if salvar:
                self.save(update_fields=['status'])
            return self.status

class Projeto(models.Model):
    class Status(models.TextChoices):
        PLANEJAMENTO = 'planejamento', 'Planejamento'
        ANDAMENTO = 'andamento', 'Em andamento'
        CONCLUIDO = 'concluido', 'Concluído'
        ATRASADO = 'atrasado', 'Atrasado'
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    prazo = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PLANEJAMENTO)
    progresso = models.PositiveSmallIntegerField(
        default=0,
        editable=False,

    )

    responsavel = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='projetos_criados',
    )

    feitos = models.CharField(max_length=500, blank=True)

    def definir_progresso(self):
       if self.status == self.Status.PLANEJAMENTO:
        self.progresso = 20
       elif self.status == self.Status.ANDAMENTO:
        self.progresso = 60
       elif self.status == self.Status.CONCLUIDO:
        self.progresso = 100 
       return self.progresso

    @property
    def esta_atrasado(self):
        from django.utils import timezone
        return self.status != self.Status.CONCLUIDO and self.prazo and self.prazo < timezone.now()

    def __str__(self):
        return self.nome

    



class ParticipacaoProjeto(models.Model):
     projeto = models.ForeignKey(
         Projeto,
         on_delete=models.CASCADE,
         related_name='participacoes',
     )

     usuario = models.CharField(max_length=100)
     tarefa = models.CharField(max_length=255, blank=True)
     concluida = models.BooleanField(default=True)

     class Meta: 
         unique_together = ('projeto', 'usuario')

     def __str__(self):
         return f'{self.usuario} em {self.projeto}'


class Avaliacao(models.Model):

    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.CASCADE,
        related_name='avaliacoes',
    )
    atividade = models.OneToOneField(
        Atividade,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='avaliacao',
    )
    projeto = models.OneToOneField(
        Projeto,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='avaliacao',
    )

    nome = models.CharField(max_length=150) 
    nota = models.DecimalField(
        max_digits=4, decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('10'))],
        help_text='Deixe vazio enquanto a nota não saiu.',
    )
    peso = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    data = models.DateField(null=True, blank=True)  # data da prova/entrega

    class Meta:
        ordering = ['data', 'nome']
        unique_together = ('disciplina', 'nome')

    def __str__(self):
        return f'{self.nome} - {self.disciplina}'

    @property
    def lancada(self):
        return self.nota is not None

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.atividade and self.atividade.disciplina_id != self.disciplina_id:
            raise ValidationError('A atividade pertence a outra disciplina.')







        

        



    
        


    

    
        

        
    

    
    
   

    




