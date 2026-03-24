from sqlalchemy import Table, Column, Integer, MetaData, DateTime, Unicode, UnicodeText, ForeignKey
from datetime import datetime

metadata = MetaData()

chat_table = Table(
    "chat_messages",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Unicode(255), index=True),
    Column("message", UnicodeText),
    Column("message_type", Unicode(50)),
    Column("created_at", DateTime, default=datetime.utcnow),
)

feedback_table = Table(
    "chat_feedback",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("message_id", Integer, ForeignKey("chat_messages.id"), index=True),
    Column("user_id", Unicode(255), index=True),
    Column("feedback", Unicode(50)),
    Column("feedback_text", UnicodeText),
    Column("created_at", DateTime, default=datetime.utcnow),
)

scraped_data_table = Table(
    "scraped_data",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Unicode(255), index=True),
    Column("url", UnicodeText),
    Column("content", UnicodeText),
    Column("created_at", DateTime, default=datetime.utcnow),
)

document_text_table = Table(
    "document_text",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Unicode(255), index=True),
    Column("filename", UnicodeText),
    Column("doctype", Unicode(50)),
    Column("content", UnicodeText),
    Column("created_at", DateTime, default=datetime.utcnow),
)
