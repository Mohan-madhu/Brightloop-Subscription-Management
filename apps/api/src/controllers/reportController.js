import prisma from '../config/db.js';
import { getDashboardMetrics, getDueDateKanban, generateQuarterlyReport } from '../services/reportService.js';

export async function getDashboard(req, res, next) {
  try {
    const metrics = await getDashboardMetrics();
    return res.status(200).json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}

export async function getKanban(req, res, next) {
  try {
    const kanban = await getDueDateKanban();
    return res.status(200).json({ success: true, data: kanban });
  } catch (err) {
    next(err);
  }
}

export async function listQuarterlyReports(req, res, next) {
  try {
    const reports = await prisma.quarterlyReport.findMany({
      orderBy: { generatedAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}

export async function createQuarterlyReport(req, res, next) {
  try {
    const { quarter, year } = req.body;
    const report = await generateQuarterlyReport(quarter, year);
    return res.status(201).json({
      success: true,
      message: 'Quarterly financial report generated successfully',
      data: report
    });
  } catch (err) {
    next(err);
  }
}
