import { Request, Response } from "express";
import prisma from "../../lib/prisma";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
};

export async function createOrganizationHandler(req: Request, res: Response) {
  try {
    const { name, slug, settings } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Generate slug from name if not provided
    const organizationSlug = slug || generateSlug(name);

    const organization = await prisma.organization.create({
      data: {
        name,
        slug: organizationSlug,
        settings,
      },
    });
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
}

export async function getAllOrganizationsHandler(req: Request, res: Response) {
  try {
    const organizations = await prisma.organization.findMany();
    res.json(organizations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
}

export async function getOrganizationByIdHandler(req: Request, res: Response) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
    });
    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
}

export async function updateOrganizationHandler(req: Request, res: Response) {
  try {
    const organization = await prisma.organization.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
}

export async function deleteOrganizationHandler(req: Request, res: Response) {
  try {
    await prisma.organization.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Organization deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
}
