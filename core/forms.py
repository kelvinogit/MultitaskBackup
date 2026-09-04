from django import forms
from .models import Disciplina, Atividade, Projeto

class DisciplinaForm(forms.ModelForm):
    class Meta:
        model = Disciplina
        fields = ['nome', 'professor', 'semestre', 'descricao']

class AtividadesForm(forms.ModelForm):
    class Meta:
        model = Atividade
        fields = ['nome', 'professor', 'semestre', 'descricao']

    def __init__(self, *args, usuario=None, **kwargs):
        super().__init__(*args, **kwargs)
        # Um usuário só pode vincular atividades às próprias disciplinas
        if usuario is not None:
            self.fields['disciplina'].queryset = Disciplina.objects.filter(usuario=usuario)

class ProjetoForm(forms.ModelForm):
    class Meta:
        model = Projeto
        fields = ['nome', 'descricao', 'prazo', 'status', 'progresso']
        widgets = {
            'prazo': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
        }


        
    