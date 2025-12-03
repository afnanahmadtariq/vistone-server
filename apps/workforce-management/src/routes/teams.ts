import { Router } from 'express';
import prisma from '../lib/prisma';
import axios from 'axios';

const router = Router();

// Service URLs for cross-service calls
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://localhost:3003';

// Types
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
  endDate?: Date;
  updatedAt?: Date;
}

// Helper to fetch user data from auth service
async function fetchUserData(userId: string) {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    return null;
  }
}

// Helper to fetch projects from project service
async function fetchProjects(): Promise<ProjectData[]> {
  try {
    const response = await axios.get(`${PROJECT_SERVICE_URL}/projects`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

// Create Team
router.post('/', async (req, res) => {
  try {
    const team = await prisma.team.create({
      data: req.body,
    });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get all Teams
router.get('/', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
      },
    }) as TeamWithMembers[];

    // Enhance teams with member count
    const enhancedTeams = teams.map((team: TeamWithMembers) => ({
      ...team,
      memberCount: team.members.length,
    }));

    res.json(enhancedTeams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get Team by ID with full details (for TeamDetails component)
router.get('/:id', async (req, res) => {
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

    // Fetch member details
    const members = await Promise.all(
      team.members.map(async (member: TeamMemberRecord) => {
        const userData = await fetchUserData(member.userId);
        return {
          id: member.userId,
          name: userData ? [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email : 'Unknown',
          role: member.role || 'member',
          email: userData?.email || '',
          status: 'active',
          avatar: null,
        };
      })
    );

    // Fetch projects and filter by team
    const allProjects = await fetchProjects();
    
    const ongoingProjects = allProjects
      .filter((p: ProjectData) => p.status !== 'completed' && p.status !== 'Completed')
      .slice(0, 5)
      .map((p: ProjectData) => ({
        id: p.id,
        name: p.name,
        deadline: p.endDate,
        status: p.status,
      }));

    const completedProjects = allProjects
      .filter((p: ProjectData) => p.status === 'completed' || p.status === 'Completed')
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
});

// Update Team
router.put('/:id', async (req, res) => {
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
});

// Delete Team
router.delete('/:id', async (req, res) => {
  try {
    await prisma.team.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Team deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Remove member from team
router.post('/remove-member', async (req, res) => {
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
});

export default router;
