import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.anthropic = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  // Analyze a bid package PDF and extract scope items
  async analyzeBidPackage(pdfBase64: string, companyId: string) {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          },
          {
            type: 'text',
            text: `You are a senior construction estimator. Analyze this bid package and extract:
1. All scope items with quantities and units
2. Material specifications (brand, model, dimensions)
3. Labor requirements
4. Any specification conflicts or flags
5. Project addresses

Respond ONLY in this JSON format:
{
  "addresses": [],
  "scopeItems": [{ "description": "", "qty": 0, "unit": "", "category": "materials|labor|equipment", "spec": "" }],
  "specFlags": [{ "issue": "", "recommendation": "" }],
  "summary": ""
}`,
          },
        ],
      }],
    });

    const text = message.content.filter(b => b.type === 'text').map((b: any) => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  // Generate a daily log from notes + weather
  async generateDailyLog(dto: { projectName: string; date: string; notes: string; weather: string; workersOnsite: number }) {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Generate a professional construction daily log entry.

Project: ${dto.projectName}
Date: ${dto.date}
Weather: ${dto.weather}
Workers on site: ${dto.workersOnsite}
Field notes: ${dto.notes}

Write a formal daily log entry (3-5 paragraphs) covering work performed, materials used, issues encountered, and next day plan. Professional construction language.`,
      }],
    });

    return { log: (message.content[0] as any).text };
  }

  // Detect risks in a project
  async detectRisks(projectId: string, companyId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      include: {
        budgets: { where: { status: 'final' }, take: 1, include: { items: true } },
        tasks: { where: { status: { not: 'done' } } },
        rfis: { where: { status: 'open' } },
        timesheets: { orderBy: { workDate: 'desc' }, take: 20 },
      },
    });
    if (!project) return { risks: [] };

    const context = {
      name: project.name,
      status: project.status,
      contractValue: project.contractValue,
      endDate: project.endDate,
      openRFIs: project.rfis.length,
      overdueTasks: project.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
      budgetTotal: project.budgets[0]?.totalSell ?? 0,
    };

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a construction project risk analyst. Analyze this project data and identify risks.

Project data: ${JSON.stringify(context)}

Respond ONLY in JSON:
{
  "risks": [
    { "type": "delay|cost|quality|safety", "severity": "low|medium|high|critical", "description": "", "recommendation": "" }
  ]
}`,
      }],
    });

    const text = (message.content[0] as any).text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }

  // Answer any question about a project
  async askAboutProject(projectId: string, companyId: string, question: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      include: {
        customer: true,
        budgets: { include: { items: true } },
        rfis: true,
        changeOrders: true,
      },
    });
    if (!project) return { answer: 'Project not found.' };

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are the Hillcore AI assistant, a construction project expert. Answer this question about the project.

Project data: ${JSON.stringify(project, null, 2)}

Question: ${question}

Answer concisely and professionally.`,
      }],
    });

    return { answer: (message.content[0] as any).text };
  }
}
