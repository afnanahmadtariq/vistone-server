import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createAutomationRuleHandler(req: Request, res: Response) {
    try {
    const automationRule = await prisma.automationRule.create({
      data: req.body,
    });
    res.json(automationRule);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create automation rule' });
    }
}

export async function getAllAutomationRulesHandler(req: Request, res: Response) {
    try {
    const automationRules = await prisma.automationRule.findMany();
    res.json(automationRules);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
    }
}

export async function getAutomationRuleByIdHandler(req: Request, res: Response) {
    try {
    const automationRule = await prisma.automationRule.findUnique({
      where: { id: req.params.id },
    });
    if (!automationRule) {
      res.status(404).json({ error: 'Automation rule not found' });
      return;
    }
    res.json(automationRule);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch automation rule' });
    }
}

export async function updateAutomationRuleHandler(req: Request, res: Response) {
    try {
    const automationRule = await prisma.automationRule.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(automationRule);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update automation rule' });
    }
}

export async function deleteAutomationRuleHandler(req: Request, res: Response) {
    try {
    await prisma.automationRule.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Automation rule deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
    }
}
