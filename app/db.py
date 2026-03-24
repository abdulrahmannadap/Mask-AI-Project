from sqlalchemy import create_engine, event
import warnings
from sqlalchemy.exc import SAWarning

# SQL Server ke version ki is harmless warning ko console se hatane ke liye:
warnings.filterwarnings('ignore', category=SAWarning, message='.*Unrecognized server version info.*')

SERVER_NAME = r"NADAP\SQLEXPRESS"
DATABASE_NAME = "chatdb"  # Yahan apne database ka exact naam likhein (e.g., "MaskAIDB")

DATABASE_URL = f"mssql+pyodbc://@{SERVER_NAME}/{DATABASE_NAME}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&Encrypt=yes&TrustServerCertificate=yes"

engine = create_engine(DATABASE_URL)

# Emoji aur special characters ko SQL Server me safely save karne ke liye encoding fix
@event.listens_for(engine, "connect")
def receive_connect(dbapi_connection, connection_record):
    try:
        import pyodbc
        dbapi_connection.setdecoding(pyodbc.SQL_WCHAR, encoding='utf-16le')
        dbapi_connection.setencoding(encoding='utf-16le')
    except Exception:
        pass
