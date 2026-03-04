import axios from 'axios';
import { PTERO_CONFIG } from '../constants.ts';

class PteroAPI {
  baseUrl: string;
  appKey: string;
  clientKey: string;
  headers: any;

  constructor() {
    this.baseUrl = PTERO_CONFIG.PANEL_URL;
    this.appKey = PTERO_CONFIG.PANEL_APP_KEY;
    this.clientKey = PTERO_CONFIG.PANEL_CLIENT_KEY;
    this.headers = {
      'Authorization': `Bearer ${this.appKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  genPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  genUsername(userId: string) {
    const suffix = Math.random().toString(36).substring(2, 6);
    return `fsp_${userId}_${suffix}`;
  }

  async getAvailableAllocation() {
    try {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const resp = await axios.get(
          `${this.baseUrl}/api/application/nodes/${PTERO_CONFIG.NODE_ID}/allocations?page=${page}&per_page=100`,
          { headers: this.headers }
        );
        
        const allocations = resp.data.data || [];
        totalPages = resp.data.meta?.pagination?.total_pages || 1;

        for (const alloc of allocations) {
          if (!alloc.attributes.assigned) {
            return alloc.attributes.id;
          }
        }
        page++;
      }
      console.error('No unassigned allocations found on node', PTERO_CONFIG.NODE_ID);
    } catch (e: any) {
      console.error('getAllocation error:', e.response?.data || e.message);
    }
    return null;
  }

  async createUser(userId: string, email: string) {
    const username = this.genUsername(userId);
    const password = this.genPassword();

    try {
      const resp = await axios.post(
        `${this.baseUrl}/api/application/users`,
        {
          email: email,
          username: username,
          first_name: `FSP_${userId}`,
          last_name: 'User',
          password: password
        },
        { headers: this.headers }
      );
      return {
        id: resp.data.attributes.id,
        username: username,
        password: password,
        email: email
      };
    } catch (e: any) {
      if (e.response && e.response.status === 422) {
        try {
          const search = await axios.get(
            `${this.baseUrl}/api/application/users?filter[email]=${email}`,
            { headers: this.headers }
          );
          const users = search.data.data || [];
          if (users.length > 0) {
            return {
              id: users[0].attributes.id,
              username: users[0].attributes.username,
              password: 'ᴜꜱᴇ ᴇxɪꜱᴛɪɴɢ ᴘᴀꜱꜱ',
              email: email,
              existing: true
            };
          }
        } catch (e2) {}
      }
      console.error('createUser error:', e.message);
    }
    return null;
  }

  async updateUserPassword(userId: number, newPassword: string) {
    try {
      const userResp = await axios.get(
        `${this.baseUrl}/api/application/users/${userId}`,
        { headers: this.headers }
      );
      const userData = userResp.data.attributes;

      await axios.patch(
        `${this.baseUrl}/api/application/users/${userId}`,
        {
          email: userData.email,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          password: newPassword
        },
        { headers: this.headers }
      );
      return true;
    } catch (e: any) {
      console.error('updatePassword error:', e.response?.data || e.message);
      return false;
    }
  }

  async createServer(userId: number, serverName: string, userRefId: string, serverType = 'unlimited') {
    const allocationId = await this.getAvailableAllocation();
    if (!allocationId) {
      return { error: 'ɴᴏ ᴀʟʟᴏᴄᴀᴛɪᴏɴ ᴀᴠᴀɪʟᴀʙʟᴇ' };
    }

    const typeConfig = PTERO_CONFIG.SERVER_TYPES[serverType] || PTERO_CONFIG.SERVER_TYPES.unlimited;

    try {
      const resp = await axios.post(
        `${this.baseUrl}/api/application/servers`,
        {
          name: serverName,
          user: userId,
          egg: PTERO_CONFIG.EGG_ID,
          docker_image: PTERO_CONFIG.DOCKER_IMAGE,
          startup: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}',
          environment: {
            GIT_ADDRESS: '',
            BRANCH: '',
            CMD_RUN: 'npm start',
            USERNAME: '',
            ACCESS_TOKEN: '',
            AUTO_UPDATE: '0',
            NODE_PACKAGES: '',
            UNNODE_PACKAGES: ''
          },
          limits: {
            memory: typeConfig.memory,
            swap: 0,
            disk: typeConfig.disk,
            io: 500,
            cpu: typeConfig.cpu
          },
          feature_limits: { databases: 0, allocations: 0, backups: 0 },
          allocation: { default: allocationId },
          description: `ꜰꜱᴘ|${serverType}|ᴜꜱᴇʀ:${userRefId}`,
          start_on_completion: false,
          oom_disabled: true
        },
        { headers: this.headers }
      );
      return {
        id: resp.data.attributes.id,
        identifier: resp.data.attributes.identifier,
        name: resp.data.attributes.name,
        uuid: resp.data.attributes.uuid
      };
    } catch (e: any) {
      console.error('createServer error:', e.response?.data || e.message);
      return { error: e.response?.data?.errors?.[0]?.detail || 'ꜱᴇʀᴠᴇʀ ᴄʀᴇᴀᴛɪᴏɴ ꜰᴀɪʟᴇᴅ' };
    }
  }

  async deleteServer(serverId: number) {
    try {
      await axios.delete(
        `${this.baseUrl}/api/application/servers/${serverId}`,
        { headers: this.headers }
      );
      return true;
    } catch (e: any) {
      console.error('deleteServer error:', e.message);
      return false;
    }
  }

  async getServerStatus(serverIdentifier: string) {
    const clientHeaders = {
      'Authorization': `Bearer ${this.clientKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      const resp = await axios.get(
        `${this.baseUrl}/api/client/servers/${serverIdentifier}/resources`,
        { headers: clientHeaders }
      );
      return {
        state: resp.data.attributes.current_state,
        cpu: resp.data.attributes.resources.cpu_absolute,
        memory: resp.data.attributes.resources.memory_bytes,
        disk: resp.data.attributes.resources.disk_bytes
      };
    } catch (e) {
      return { state: 'unknown', cpu: 0, memory: 0, disk: 0 };
    }
  }

  async sendPowerAction(serverIdentifier: string, action: 'start' | 'stop' | 'restart' | 'kill') {
    const clientHeaders = {
      'Authorization': `Bearer ${this.clientKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      await axios.post(
        `${this.baseUrl}/api/client/servers/${serverIdentifier}/power`,
        { signal: action },
        { headers: clientHeaders }
      );
      return true;
    } catch (e: any) {
      console.error('sendPowerAction error:', e.response?.data || e.message);
      return false;
    }
  }

  async getAllServers() {
    try {
      const resp = await axios.get(
        `${this.baseUrl}/api/application/servers`,
        { headers: this.headers }
      );
      return resp.data.data || [];
    } catch (e: any) {
      console.error('getAllServers error:', e.message);
      return [];
    }
  }
}

export const ptero = new PteroAPI();
