from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class SignupForm(forms.ModelForm):
    senha = forms.CharField(min_lenght=8)
    confirmar = forms.CharField()



    class Meta:
        model = User 
        fields = ['nome', 'email','curso']

    def clean_email(self):
        email = self.changed_data['email'].lower().strip()
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
        user = User.objects.create_user(
              email=self.cleaned_data['email'],
              nome=self.cleaned_data['nome'],
              password=self.cleaned_data['senha'],
              curso=self.cleaned_data['curso'],
         ) 

        return user 

class EmailLoginForm(forms.Form):
     email = forms.EmailField()
     senha = forms.CharField()


     
        




