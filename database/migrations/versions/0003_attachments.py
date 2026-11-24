"""Tệp đính kèm cho hồ sơ đăng ký/sang tên và yêu cầu bồi thường (nội dung lưu trên đĩa, bảng chỉ giữ siêu dữ liệu).

Revision ID: 0003
Revises: 0002
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE attachments (
            attachment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            request_id    BIGINT REFERENCES registration_requests(request_id),
            claim_id      BIGINT REFERENCES insurance_claims(claim_id),
            uploaded_by   BIGINT NOT NULL REFERENCES users(user_id),
            original_name VARCHAR(255) NOT NULL,
            content_type  VARCHAR(100) NOT NULL,
            size_bytes    INT NOT NULL,
            storage_name  VARCHAR(64) NOT NULL UNIQUE,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_attach_size CHECK (size_bytes > 0),
            CONSTRAINT ck_attach_one_parent CHECK ((request_id IS NOT NULL)::int + (claim_id IS NOT NULL)::int = 1)
        )""")
    op.execute("CREATE INDEX ix_attach_request ON attachments (request_id) WHERE request_id IS NOT NULL")
    op.execute("CREATE INDEX ix_attach_claim   ON attachments (claim_id)   WHERE claim_id IS NOT NULL")


def downgrade():
    op.execute("DROP TABLE attachments")
