#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
  TravaillerEnCi — scraper/core/scheduler.py
  Scheduler APScheduler (Toutes les heures, 6h, tous les jours, cron)
===============================================================================
"""

from __future__ import annotations

import time
from apscheduler.schedulers.blocking import BlockingScheduler
from scraper.core.logger import setup_logger

logger = setup_logger("scheduler")


class JobScheduler:
    def __init__(self, target_func):
        self.scheduler = BlockingScheduler()
        self.target_func = target_func

    def schedule_hourly(self):
        self.scheduler.add_job(self.target_func, 'interval', hours=1, id='hourly_scraping')
        logger.info("📅 Scheduler configuré : Toutes les heures")

    def schedule_every_6_hours(self):
        self.scheduler.add_job(self.target_func, 'interval', hours=6, id='six_hourly_scraping')
        logger.info("📅 Scheduler configuré : Toutes les 6 heures")

    def schedule_daily(self):
        self.scheduler.add_job(self.target_func, 'interval', days=1, id='daily_scraping')
        logger.info("📅 Scheduler configuré : Tous les jours")

    def schedule_cron(self, cron_expression: str):
        # cron_expression ex: "0 */6 * * *"
        parts = cron_expression.split()
        if len(parts) == 5:
            minute, hour, day, month, day_of_week = parts
            self.scheduler.add_job(
                self.target_func, 'cron',
                minute=minute, hour=hour, day=day, month=month, day_of_week=day_of_week,
                id='cron_scraping'
            )
            logger.info(f"📅 Scheduler configuré avec Cron : {cron_expression}")

    def start(self):
        logger.info("🚀 Démarrage du Scheduler APScheduler...")
        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("🛑 Arrêt du Scheduler.")
