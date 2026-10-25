from django import forms
from .models import Disciplina, Atividade, Projeto, ParticipacaoProjeto, Avaliacao

class DisciplinaForm(forms.ModelForm):
    class Meta:
        model = Disciplina
        fields = ['nome', 'professor', 'semestre', 'descricao', 'nota_necessaria']

class AtividadesForm(forms.ModelForm):
    class Meta:
        model = Atividade
        fields = ['titulo', 'descricao', 'disciplina', 'tipo', 'prazo', 'prioridade', 'status', 'observacoes']
        widgets = {
            'prazo': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
        }

    def __init__(self, *args, usuario=None, **kwargs):
        super().__init__(*args, **kwargs)
        # Um usuário só pode vincular atividades às próprias disciplinas
        if usuario is not None:
            self.fields['disciplina'].queryset = Disciplina.objects.filter(usuario=usuario)

class ProjetoForm(forms.ModelForm):
    class Meta:
        model = Projeto
        fields = ['nome', 'descricao', 'prazo', 'status', 'feitos']
        widgets = {
            'prazo': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
        }
class ParticipacaoProjetoForm(forms.ModelForm):
    class Meta:
        model = ParticipacaoProjeto
        fields =['usuario','tarefa', 'projeto']

    def __init__(self, *args, responsavel=None, **kwargs):
        super().__init__(*args, **kwargs)
        if responsavel is not None:
            self.fields['projeto'].queryset = Projeto.objects.filter(responsavel=responsavel)


class AvaliacaoForm(forms.ModelForm):
    class Meta:
        model = Avaliacao
        fields = ['nome', 'peso', 'data', 'nota']
        widgets = {
            'peso': forms.NumberInput(attrs={'min': '0.01', 'step': '0.01'}),
            'data': forms.DateInput(attrs={'type': 'date'}),
            'nota': forms.NumberInput(attrs={'min': '0', 'max': '10', 'step': '0.01'}),
        }

    def __init__(self, *args, disciplina, **kwargs):
        self.disciplina = disciplina
        kwargs.setdefault('instance', Avaliacao(disciplina_id=disciplina))
        super().__init__(*args, **kwargs)

    def clean_nome(self):
        nome = self.cleaned_data['nome']
        avaliacoes = Avaliacao.objects.filter(
            disciplina_id=self.disciplina,
            nome=nome,
        )
        if self.instance.pk:
            avaliacoes = avaliacoes.exclude(pk=self.instance.pk)
        if avaliacoes.exists():
            raise forms.ValidationError(
                'Já existe uma avaliação com esse nome nesta disciplina.'
            )
        return nome

    def save(self, commit=True):
        avaliacao = super().save(commit=False)
        avaliacao.disciplina_id = self.disciplina
        if commit:
            avaliacao.save()
        return avaliacao


class LancarNotaForm(forms.ModelForm):
    nota = forms.DecimalField(
        min_value=0,
        max_value=10,
        max_digits=4,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'min': '0',
            'max': '10',
            'step': '0.01',
        }),
    )

    class Meta:
        model = Avaliacao
        fields = ['nota']
