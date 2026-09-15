const axios = require('axios');

(async () => {
  try {
    const api = axios.create({ baseURL: 'https://pos.sonaribd.com/api/v1' });
    
    // Login
    console.log("Logging in...");
    const loginRes = await api.post('/login', { email: 'admin@sonaribd.com', password: 'Admin@123456' });
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    let buId, branchId, warehouseId, terminalId;

    // STEP 1: Business Unit
    let buRes = await api.get('/business-units');
    let bus = buRes.data?.data || [];
    if (bus.length === 0) {
      console.log("Creating Business Unit...");
      const res = await api.post('/business-units', {
        name: 'Ladies Undergarments',
        code: 'LADIES',
        status: 'active'
      });
      console.log("BU Create Status:", res.status, res.data.message);
      buRes = await api.get('/business-units');
      bus = buRes.data?.data || [];
    }
    const bu = bus[0];
    buId = bu.id;
    console.log("Business Unit ID:", bu.id, "UUID:", bu.uuid, "Company:", bu.company_id);

    // STEP 2: Branch
    let branchRes = await api.get('/branches');
    let branches = branchRes.data?.data || [];
    if (branches.length === 0) {
      console.log("Creating Branch...");
      const res = await api.post('/branches', {
        business_unit_id: buId,
        name: 'Main Branch',
        code: 'MAIN',
        status: 'active'
      });
      console.log("Branch Create Status:", res.status, res.data.message);
      branchRes = await api.get('/branches');
      branches = branchRes.data?.data || [];
    }
    const branch = branches[0];
    branchId = branch.id;
    console.log("Branch ID:", branch.id, "UUID:", branch.uuid, "Company:", branch.company_id, "BU:", branch.business_unit_id);

    // STEP 3: Warehouse
    // Note: warehouse_type valid options: CENTRAL, BRANCH, STORE, RETURN, DAMAGED
    let whRes = await api.get('/warehouses');
    let warehouses = whRes.data?.data || [];
    if (warehouses.length === 0) {
      console.log("Creating Warehouse...");
      const res = await api.post('/warehouses', {
        business_unit_id: buId,
        branch_id: branchId,
        name: 'Main Warehouse',
        code: 'MAIN-WH',
        warehouse_type: 'CENTRAL', // Not MAIN
        status: 'active'
      });
      console.log("Warehouse Create Status:", res.status, res.data.message);
      whRes = await api.get('/warehouses');
      warehouses = whRes.data?.data || [];
    }
    const warehouse = warehouses[0];
    warehouseId = warehouse.id;
    console.log("Warehouse ID:", warehouse.id, "UUID:", warehouse.uuid, "Company:", warehouse.company_id, "BU:", warehouse.business_unit_id, "Branch:", warehouse.branch_id);

    // STEP 4: POS Terminal
    let termRes = await api.get('/pos/terminals');
    let terminals = termRes.data?.data || [];
    if (terminals.length === 0) {
      console.log("Creating POS Terminal...");
      const res = await api.post('/pos/terminals', {
        terminal_code: 'POS-001',
        terminal_name: 'Main Counter',
        warehouse_id: warehouseId,
        branch_id: branchId,
        status: 'ACTIVE'
      });
      console.log("Terminal Create Status:", res.status, res.data.message);
      termRes = await api.get('/pos/terminals');
      terminals = termRes.data?.data || [];
    }
    const terminal = terminals[0];
    terminalId = terminal.id;
    console.log("Terminal ID:", terminal.id, "Code:", terminal.terminal_code, "Company:", terminal.company_id, "Warehouse:", terminal.warehouse_id);

  } catch (e) {
    console.error("ERROR:", e.response ? JSON.stringify(e.response.data) : e.message);
  }
})();
