const Agenda = require("agenda");
const dayjs = require("dayjs");
const FactoryModel = require("../models/factory");
const MachineLogsFileModel = require("../models/machine-logs-file");
const MachineLogsDataModel = require("../models/machine-logs-data");

const agenda = new Agenda({
  db: { address: process.env.MONGO_URI, collection: "agendaJobs" },
  processEvery: "5 seconds", // Customize based on needs
});

agenda.on('success', (job) => {
  console.log(`Job ${job.attrs.name} completed successfully`);
});

agenda.on('fail', (err, job) => {
  console.error(`Job ${job.attrs.name} failed: ${err.message}`);
});

agenda.define("sync-machine-logs-file", async (job) => {
  const { body } = job.attrs.data;
  
  const factory = await FactoryModel.findOne({
    name: body.factory,
  }).lean();

  if (!factory) {
    throw new Error("Factory not found");
  }

  body.factory = factory._id;

  const filter = {
    filename: body.filename,
    machine: body.machine,
    factory: body.factory,
  };

  await MachineLogsFileModel.findOneAndUpdate(
    filter,
    body,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
});

agenda.define("sync-machine-logs-data", async (job) => {
  const { body } = job.attrs.data;

  const factory = await FactoryModel.findOne({
    name: body.factory,
  }).lean();

  if (!factory) {
    throw new Error("Factory not found");
  }

  body.factory = factory._id;

  if (body.date) {
    body.date = new Date(body.date);
  }

  const filter = {
    date: body.date,
    code: body.code,
    machine: body.machine,
    factory: body.factory,
  };

  await MachineLogsDataModel.findOneAndUpdate(
    filter,
    {
      ...body,
      date_string: dayjs(body.date).format("HH:mm:ss DD/MM/YYYY"),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
});

module.exports = agenda;
