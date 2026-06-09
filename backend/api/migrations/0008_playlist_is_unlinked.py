# Generated manually — add is_unlinked to Playlist

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_video_is_removed"),
    ]

    operations = [
        migrations.AddField(
            model_name="playlist",
            name="is_unlinked",
            field=models.BooleanField(default=False, db_index=True),
        ),
    ]
