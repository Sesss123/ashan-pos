const prisma = require('../config/db');

// ---- FLOOR MANAGEMENT ----

const createFloor = async (req, res) => {
  try {
    const { branchId, name, description, layoutConfig } = req.body;
    const floor = await prisma.floor.create({
      data: { branchId, name, description, layoutConfig }
    });
    res.status(201).json({ message: 'Floor created', floor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create floor', error: error.message });
  }
};

const getFloors = async (req, res) => {
  try {
    const { branchId } = req.query;
    const floors = await prisma.floor.findMany({
      where: { branchId },
      include: { tables: true }
    });
    res.json(floors);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch floors' });
  }
};

// ---- TABLE CRUD & RESERVATIONS ----

const getTables = async (req, res) => {
  try {
    const tables = await prisma.table.findMany();
    res.json({ data: tables });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tables' });
  }
};

const createTable = async (req, res) => {
  try {
    const { name, status, branchId } = req.body;
    // Default branchId to 'global' if not provided for now, or you can allow null
    const table = await prisma.table.create({
      data: { name, status: status || 'Available' }
    });
    const io = req.app.get('io');
    if (io) io.emit('table.updated', table);
    res.status(201).json({ message: 'Table created', table });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create table', error: error.message });
  }
};

const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const table = await prisma.table.update({
      where: { id },
      data: { name, status }
    });
    const io = req.app.get('io');
    if (io) io.emit('table.updated', table);
    res.json({ message: 'Table updated', table });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update table', error: error.message });
  }
};

const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.table.delete({ where: { id } });
    const io = req.app.get('io');
    if (io) io.emit('table.updated', { id });
    res.json({ message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete table', error: error.message });
  }
};


const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({ where: { id } });
      if (!table) throw new Error('Table not found');

      const updatedTable = await tx.table.update({
        where: { id },
        data: { status }
      });

      // Log status change
      await tx.tableStatusLog.create({
        data: { tableId: id, oldStatus: table.status, newStatus: status, changedBy: userId }
      });

      return updatedTable;
    });

    // Emit Socket.IO Event
    const io = req.app.get('io');
    if (io) io.to(result.branchId).emit('table.status_changed', result);

    res.json({ message: 'Table status updated', table: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update table status', error: error.message });
  }
};

const createReservation = async (req, res) => {
  try {
    const { branchId, tableId, customerName, phone, date, time, pax } = req.body;
    
    const reservation = await prisma.tableReservation.create({
      data: { branchId, tableId, customerName, phone, date: new Date(date), time, pax, status: 'Confirmed' }
    });

    // Update table status to Reserved
    await prisma.table.update({
      where: { id: tableId },
      data: { status: 'Reserved' }
    });

    const io = req.app.get('io');
    if (io) io.to(branchId).emit('table.status_changed', { id: tableId, status: 'Reserved' });

    res.status(201).json({ message: 'Reservation created', reservation });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create reservation', error: error.message });
  }
};

const getReservations = async (req, res) => {
  try {
    const { branchId } = req.query;
    const reservations = await prisma.tableReservation.findMany({
      where: { branchId },
      include: { table: true },
      orderBy: { date: 'asc' }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }
};

module.exports = {
  createFloor,
  getFloors,
  updateTableStatus,
  createReservation,
  getReservations,
  getTables,
  createTable,
  updateTable,
  deleteTable
};
