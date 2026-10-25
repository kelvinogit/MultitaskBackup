from decimal import Decimal, ROUND_HALF_UP

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Avg


def preencher_medias_finais(apps, schema_editor):
    Disciplina = apps.get_model('core', 'Disciplina')
    Avaliacao = apps.get_model('core', 'Avaliacao')
    banco = schema_editor.connection.alias

    for disciplina in Disciplina.objects.using(banco).all().iterator():
        media = (
            Avaliacao.objects.using(banco)
            .filter(disciplina_id=disciplina.pk, nota__isnull=False)
            .aggregate(media=Avg('nota'))['media']
        )
        disciplina.media_final = (
            media.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if media is not None else None
        )
        disciplina.save(using=banco, update_fields=['media_final'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_alter_disciplina_media_final'),
    ]

    operations = [
        migrations.AlterField(
            model_name='atividade',
            name='disciplina',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='atividades',
                to='core.disciplina',
            ),
        ),
        migrations.AlterField(
            model_name='projeto',
            name='progresso',
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text='Percentual de progresso (0 a 100)',
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
        migrations.RunPython(preencher_medias_finais, migrations.RunPython.noop),
    ]
