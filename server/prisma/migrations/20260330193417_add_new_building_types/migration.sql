-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BuildingType" ADD VALUE 'fountain';
ALTER TYPE "BuildingType" ADD VALUE 'market';
ALTER TYPE "BuildingType" ADD VALUE 'school';
ALTER TYPE "BuildingType" ADD VALUE 'farm';
ALTER TYPE "BuildingType" ADD VALUE 'barn';
ALTER TYPE "BuildingType" ADD VALUE 'bridge';
ALTER TYPE "BuildingType" ADD VALUE 'gazebo';
ALTER TYPE "BuildingType" ADD VALUE 'garden';
ALTER TYPE "BuildingType" ADD VALUE 'dragon';
ALTER TYPE "BuildingType" ADD VALUE 'ship';
ALTER TYPE "BuildingType" ADD VALUE 'lighthouse';
ALTER TYPE "BuildingType" ADD VALUE 'forge';
ALTER TYPE "BuildingType" ADD VALUE 'inn';
ALTER TYPE "BuildingType" ADD VALUE 'temple';
ALTER TYPE "BuildingType" ADD VALUE 'arena';
ALTER TYPE "BuildingType" ADD VALUE 'greenhouse';
ALTER TYPE "BuildingType" ADD VALUE 'observatory';
ALTER TYPE "BuildingType" ADD VALUE 'treasure';
ALTER TYPE "BuildingType" ADD VALUE 'flower_bed';
ALTER TYPE "BuildingType" ADD VALUE 'pond';
ALTER TYPE "BuildingType" ADD VALUE 'statue';
ALTER TYPE "BuildingType" ADD VALUE 'campfire';
ALTER TYPE "BuildingType" ADD VALUE 'tent';
