# Generated manually — add is_removed to Video

from django.db import migrations, models


def _fill_null_updated_at(apps, schema_editor):
    """Set updated_at = created_at for rows where updated_at is NULL.

    Migration 0004 added updated_at as nullable; later model changes
    (auto_now=True) make it NOT NULL.  SQLite table-rebuild during
    AddField fails on any remaining NULL values.
    """
    schema_editor.execute(
        "UPDATE api_video SET updated_at = created_at WHERE updated_at IS NULL"
    )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_youtubeoauthtoken"),
    ]

    operations = [
        migrations.RunPython(_fill_null_updated_at, migrations.RunPython.noop),
        migrations.AddField(
            model_name="video",
            name="is_removed",
            field=models.BooleanField(default=False),
        ),
    ]
