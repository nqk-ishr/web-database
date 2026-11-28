"""Nhật ký thao tác (audit log) của cán bộ và quản trị.

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE audit_log (
            audit_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            actor_id    BIGINT REFERENCES users(user_id),
            action      VARCHAR(60) NOT NULL,          -- vd. request.approve, claim.paid, user.deactivate
            entity_type VARCHAR(40) NOT NULL,
            entity_id   BIGINT,
            detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )""")
    op.execute("CREATE INDEX ix_audit_entity ON audit_log (entity_type, entity_id, created_at DESC)")
    op.execute("CREATE INDEX ix_audit_actor  ON audit_log (actor_id, created_at DESC)")
    op.execute("CREATE INDEX ix_audit_action ON audit_log (action, created_at DESC)")


def downgrade():
    op.execute("DROP TABLE audit_log")
