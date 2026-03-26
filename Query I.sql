USE [chatdb]
GO
/****** Object:  Table [dbo].[chat_feedback]    Script Date: 24-03-2026 21:42:54 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chat_feedback](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[message_id] [int] NULL,
	[user_id] [nvarchar](255) NULL,
	[feedback] [nvarchar](50) NULL,
	[feedback_text] [nvarchar](max) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[chat_messages]    Script Date: 24-03-2026 21:42:54 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[chat_messages](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [nvarchar](255) NULL,
	[message] [nvarchar](max) NULL,
	[message_type] [nvarchar](50) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[document_text]    Script Date: 24-03-2026 21:42:54 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[document_text](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [nvarchar](255) NULL,
	[filename] [nvarchar](max) NULL,
	[doctype] [nvarchar](50) NULL,
	[content] [nvarchar](max) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[scraped_data]    Script Date: 24-03-2026 21:42:54 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[scraped_data](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [nvarchar](255) NULL,
	[url] [nvarchar](max) NULL,
	[content] [nvarchar](max) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[chat_messages] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[document_text] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[scraped_data] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[chat_feedback]  WITH CHECK ADD FOREIGN KEY([message_id])
REFERENCES [dbo].[chat_messages] ([id])
GO
