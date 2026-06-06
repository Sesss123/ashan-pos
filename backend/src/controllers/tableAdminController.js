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

// ---- TABLE STATUS & RESERVATIONS ----

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
    if (io) io.to(result.branchId).emit('tableStatusChanged', result);

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
    if (io) io.to(branchId).emit('tableStatusChanged', { id: tableId, status: 'Reserved' });

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
  getReservations
};
