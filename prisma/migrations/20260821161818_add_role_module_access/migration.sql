-- CreateTable
CREATE TABLE "RoleModuleAccess" (
    "role" "UserRole" NOT NULL,
    "modules" TEXT[],

    CONSTRAINT "RoleModuleAccess_pkey" PRIMARY KEY ("role")
);
