from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.forms import AuthenticationForm
from core.models import Curso

User = get_user_model()

class SignupForm(forms.ModelForm):
    senha = forms.CharField(min_length=8)
    confirmar = forms.CharField()
    curso = forms.ModelChoiceField(queryset=Curso.objects.all(), required=True)

    class Meta:
        model = User 
        fields = ['nome', 'email','curso']

    def clean_nome(self):
        nome = self.cleaned_data['nome'].strip()
        return nome 

    def clean_email(self):
        email = self.cleaned_data['email'].lower().strip()
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('emails ja cadastrado')
        return email

    def clean(self):
        cleaned = super().clean()
        senha = cleaned.get('senha')
        confirmar = cleaned.get('confirmar')


        if senha and confirmar and senha != confirmar:
                raise forms.ValidationError('senhas nao batem ')
        if senha:
            validate_password(senha)
        return cleaned
    
    def save(self, commit=True):
        user = super().save(commit=True)
        user.set_password(self.clean_data['senha'])
        if commit:
             user.save()
        return user 

class EmailLoginForm(forms.Form):
     username = forms.EmailField(label='E-mail')


     
        




