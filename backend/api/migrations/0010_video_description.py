from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0009_useraisettings"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
