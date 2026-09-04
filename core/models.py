from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import MinValueValidator, MaxValueValidator

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
        """
             Promove o status para ATRASADA quando o prazo já passou e a
        atividade ainda não foi concluída, sem sobrescrever o status
        caso já esteja concluída. Não "desatrasa" automaticamente se
        o usuário adiar o prazo (isso é feito manualmente).

        """
        if self.esta_atrasada and self.status != self.Status.ATRASADA:
            self.status = self.Status.ATRASADA
            if salvar:
                self.save(update_fields=['status'])
            return self.status

class Projeto(models.Model):
    """ Trabalho em grupo """
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
        validators=[MinValueValidator(0), MinValueValidator(100)],
        help_text='Percentual de progresso (0 a 100)',

    )

    responsavel = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='projetos_criados',
    )

    integrantes = models.ManyToManyField(
        'accounts.User',
        through="ParticipacaoProjeto",
        related_name='projetos',
    )
    @property
    def esta_atrasado(self):
        from django.utils import timezone
        return self.status != self.Status.CONCLUIDO and self.prazo and self.prazo < timezone.now()



class ParticipacaoProjeto(models.Model):
     """
    Tabela 'through' do M:N Projeto <-> Usuário — guarda a tarefa
    individual de cada integrante dentro do projeto.
    """
     projeto = models.ForeignKey(
         Projeto,
         on_delete=models.CASCADE,
         related_name='participacoes',
     )

     usuario = models.ForeignKey(
         'accounts.User',
         on_delete=models.CASCADE,
         related_name='participacoes_projeto', 
     )
     tarefa = models.CharField(max_length=255, blank=True)
     concluida = models.BooleanField(default=True)

     class Meta: 
         unique_together = ('projeto', 'usuario')

     def __str__(self):
         return f'{self.usuario} em {self.projeto}'

class Pontuacao(models.Model):
    """
    Framework genérico de gamificação. Usado de forma mais intensa
    pelo módulo Contábil, mas disponível para qualquer área.
    """
    usuario = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='pontuacoes'
        )
    acao = models.CharField(max_length=150)
    pontos = models.IntegerField()
    data = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data']

    def __str__(self):
        return f'{self.usuario} · {self.acao} ({self.pontos:+d})'

    @classmethod
    def total_do_usuario(cls, usuario):
        total = cls.objects.filter(usuario=usuario.aggregate(total=models.Sum('pontos')))['total']
        return total or 0



    
        


    

    
        

        
    

    
    
   

    




