CREATE TABLE `asset_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `revisions_asset_idx` ON `asset_revisions` (`asset_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`format_id` text NOT NULL,
	`universe` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`content` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`published_at` text,
	`published_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_updated_idx` ON `assets` (`updated_at`);--> statement-breakpoint
CREATE TABLE `cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`operation` text NOT NULL,
	`quantity` text NOT NULL,
	`cost_usd` real NOT NULL,
	`asset_id` text,
	`media_id` text,
	`external_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `costs_created_idx` ON `cost_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `exports` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`kind` text NOT NULL,
	`files` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`stage` text NOT NULL,
	`model` text NOT NULL,
	`prediction_id` text,
	`input` text NOT NULL,
	`request` text NOT NULL,
	`media_id` text,
	`error` text,
	`asset_id` text,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`is_ai` integer DEFAULT false NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`prompt` text,
	`model` text,
	`params` text,
	`source_media_id` text,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`favourite` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media` (`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
