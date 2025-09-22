const { SlashCommandBuilder } = require('discord.js');
const { harper_attitude_value } = require('../../index.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('attitude')
		.setDescription('Check Harper\'s attitude value'),
	async execute(interaction) {
		await interaction.reply('Harper\'s current attitude value is: ' + harper_attitude_value);
	},
};