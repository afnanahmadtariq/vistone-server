import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import axios from "axios";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://localhost:3003';
interface TeamWithMembers {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: TeamMemberRecord[];
}
interface TeamMemberRecord {
  id: string;
  teamId: string;
  userId: string;
  role: string | null;
  createdAt: Date;
  updatedAt: Date;
}
interface ProjectData {
  id: string;
  name: string;
  status: string;
  teamIds?: string[];
  endDate?: Date;
  updatedAt?: Date;
}
async function fetchUserData(userId: string) {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    return null;
  }
}

async function fetchUserRole(userId: string): Promise<string> {
  try {
    // Get organization membership for the user
    const membershipsRes = await axios.get(`${AUTH_SERVICE_URL}/organization-members?userId=${userId}`);
    const memberships = membershipsRes.data;
    if (Array.isArray(memberships) && memberships.length > 0 && memberships[0].roleId) {
      // Fetch the role name
      const roleRes = await axios.get(`${AUTH_SERVICE_URL}/roles/${memberships[0].roleId}`);
      if (roleRes.data?.name) return roleRes.data.name;
    }
  } catch (error) {
    console.error(`Failed to fetch role for user ${userId}:`, error);
  }
  return 'Contributor';
}

async function fetchProjects(): Promise<ProjectData[]> {
  try {
    const response = await axios.get(`${PROJECT_SERVICE_URL}/projects`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

export async function createTeamHandler(req: Request, res: Response) {
  try {
    const team = await prisma.team.create({
      data: req.body,
    });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team' });
  }
}

export async function getAllTeamsHandler(req: Request, res: Response) {
  try {
    const { organizationId } = req.query;
    const where: Record<string, unknown> = {};

    if (organizationId) {
      where.organizationId = organizationId as string;
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        members: true,
      },
    }) as TeamWithMembers[];

    // Fetch all projects once to avoid multiple API calls
    const allProjects = await fetchProjects();

    const enhancedTeams = await Promise.all(teams.map(async (team: TeamWithMembers) => {
      // Fetch manager data
      let manager = null;
      if (team.managerId) {
        const managerData = await fetchUserData(team.managerId);
        if (managerData) {
          manager = {
            id: managerData.id,
            name: [managerData.firstName, managerData.lastName].filter(Boolean).join(' ') || managerData.email,
            avatar: null,
          };
        }
      }

      // Fetch enriched member data with real roles
      const members = await Promise.all(
        team.members.map(async (member: TeamMemberRecord) => {
          const userData = await fetchUserData(member.userId);
          const role = await fetchUserRole(member.userId);
          return {
            id: member.userId,
            name: userData ? [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email : 'Unknown',
            role,
            jobTitle: userData?.jobTitle || '',
            email: userData?.email || '',
            status: userData?.status || 'active',
            avatar: null,
          };
        })
      );

      // Filter projects for this team
      const ongoingCount = allProjects.filter((p: ProjectData) => p.teamIds?.includes(team.id) && p.status !== 'completed' && p.status !== 'Completed').length;
      const completedCount = allProjects.filter((p: ProjectData) => p.teamIds?.includes(team.id) && (p.status === 'completed' || p.status === 'Completed')).length;

      return {
        ...team,
        memberCount: team.members.length,
        assignedProjects: ongoingCount + completedCount,
        manager,
        members,
      };
    }));

    res.json(enhancedTeams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

export async function getTeamByIdHandler(req: Request, res: Response) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Fetch manager data if managerId exists
    let manager = null;
    if (team.managerId) {
      const managerData = await fetchUserData(team.managerId);
      if (managerData) {
        manager = {
          id: managerData.id,
          name: [managerData.firstName, managerData.lastName].filter(Boolean).join(' ') || managerData.email,
          avatar: null,
        };
      }
    }

    // Fetch member details with real roles from org membership
    const members = await Promise.all(
      team.members.map(async (member: TeamMemberRecord) => {
        const userData = await fetchUserData(member.userId);
        const role = await fetchUserRole(member.userId);
        return {
          id: member.userId,
          name: userData ? [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email : 'Unknown',
          role,
          jobTitle: userData?.jobTitle || '',
          email: userData?.email || '',
          status: userData?.status || 'active',
          avatar: null,
        };
      })
    );

    // Fetch projects and filter by team
    const allProjects = await fetchProjects();

    const ongoingProjects = allProjects
      .filter((p: ProjectData) => p.teamIds?.includes(team.id) && p.status !== 'completed' && p.status !== 'Completed')
      .slice(0, 5)
      .map((p: ProjectData) => ({
        id: p.id,
        name: p.name,
        deadline: p.endDate,
        status: p.status,
      }));

    const completedProjects = allProjects
      .filter((p: ProjectData) => p.teamIds?.includes(team.id) && (p.status === 'completed' || p.status === 'Completed'))
      .slice(0, 5)
      .map((p: ProjectData) => ({
        id: p.id,
        name: p.name,
        completedDate: p.endDate || p.updatedAt,
      }));

    // Build enhanced response
    const enhancedTeam = {
      ...team,
      memberCount: team.members.length,
      assignedProjects: ongoingProjects.length + completedProjects.length,
      tags: [], // Could be extended to support team tags
      manager,
      members,
      ongoingProjects,
      completedProjects,
    };

    res.json(enhancedTeam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
}

export async function updateTeamHandler(req: Request, res: Response) {
  try {
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update team' });
  }
}

export async function deleteTeamHandler(req: Request, res: Response) {
  try {
    // First delete all team members associated with the team
    await prisma.teamMember.deleteMany({
      where: { teamId: req.params.id },
    });

    // Then delete the team itself
    await prisma.team.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
}

export async function removeMemberFromTeamHandler(req: Request, res: Response) {
  try {
    const { teamId, memberId } = req.body;

    if (!teamId || !memberId) {
      res.status(400).json({ error: 'teamId and memberId are required' });
      return;
    }

    // Find the team member record
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: memberId,
      },
    });

    if (!teamMember) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    // Delete the team member
    await prisma.teamMember.delete({
      where: { id: teamMember.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
}
