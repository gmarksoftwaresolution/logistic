# Logistic Platform Enterprise Architecture Blueprint

This document defines the production-level, enterprise-grade architecture for **Logistic**, a highly scalable logistics ecosystem platform. The platform supports dual mobile applications (**SHG App** and **Transporter App**) built with React Native, powered by a shared **NestJS (TypeScript) backend**, **PostgreSQL (via Prisma ORM)**, **Socket.IO** (real-time tracking), **Redis** (caching and geospatial pub/sub), **Firebase Cloud Messaging** (push notifications), and **Google Maps API**.

---

## 1. Complete Folder Structure

Below is the production-ready directory structure for the Monorepo, designed to scale into independent microservices in the future.

```text
logistic/
├── apps/
│   ├── shg-app/                      # React Native mobile application for SHG Partners
│   │   ├── android/                  # Native Android configuration (Gradle, Manifest)
│   │   ├── ios/                      # Native iOS configuration (Cocoapods, Info.plist)
│   │   └── src/
│   │       ├── api/                  # Axios HTTP client, API routes, interceptors
│   │       ├── assets/               # Fonts, local image assets, vector graphics
│   │       ├── components/           # Atomic & molecular reusable UI elements
│   │       ├── constants/            # Theme, color palettes, scale/typography systems
│   │       ├── hooks/                # Custom React hooks (useGeolocation, useAuth, useSocket)
│   │       ├── navigation/           # React Navigation stack & tab definitions
│   │       ├── redux/                # Redux Toolkit root store, slices (auth, tracking)
│   │       ├── screens/              # Screen components (Auth, Dashboard, Earnings, LiveTracking)
│   │       ├── services/             # Core local services (background task manager)
│   │       ├── sockets/              # Socket.IO emitter/listener bindings
│   │       ├── utils/                # Date formatters, coordinate calculation helpers
│   │       ├── validations/          # Formik/Yup or Zod input schemas
│   │       └── App.tsx               # App core provider shell
│   └── transporter-app/              # React Native mobile application for Fleet/Drivers
│       ├── android/
│       ├── ios/
│       └── src/
│           ├── api/
│           ├── assets/
│           ├── components/
│           ├── constants/
│           ├── hooks/
│           ├── navigation/
│           ├── redux/
│           ├── screens/              # Screen components (Logistics, Scanning, Routes)
│           ├── services/
│           ├── sockets/
│           ├── utils/
│           ├── validations/
│           └── App.tsx
├── backend/
│   ├── prisma/                       # Prisma Schema, migrations, database seeding
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/                   # Global configuration (env, DB, Redis, FCM)
│   │   ├── common/                   # Base classes, exception filters, DTO schemas
│   │   ├── middleware/               # Auth guards, logging, rate-limiter, validator
│   │   ├── modules/                  # Domain-Driven Core Modules
│   │   │   ├── auth/                 # Authentication (JWT, OTP, flow logic)
│   │   │   ├── users/                # Core user registry
│   │   │   ├── shg/                  # SHG specific business profiles
│   │   │   ├── transporter/          # Vehicle, license, driver registry
│   │   │   ├── logistics/            # Order states, workflow lifecycle
│   │   │   ├── tracking/             # Geo-spatial coordinates ingestion
│   │   │   ├── assignments/          # Auto-assign pipelines, routes
│   │   │   ├── darkstores/           # Inventory, warehouse coordinates
│   │   │   ├── notifications/        # Firebase FCM dispatch routines
│   │   │   ├── analytics/            # Reporting, trip analysis, query engines
│   │   │   ├── complaints/           # Customer support issue tracker
│   │   │   └── reports/              # PDF/Excel dispatch generators
│   │   ├── queues/                   # BullMQ jobs, workers, and dashboard
│   │   ├── sockets/                  # Socket.IO events, namespaces, gateways
│   │   ├── integrations/             # Google Maps, SMS, Cloudinary interfaces
│   │   ├── jobs/                     # Agenda.js or cron scheduled actions
│   │   └── utils/                    # Encryption, JWT encoders, winston logger
│   ├── package.json
│   └── tsconfig.json
├── packages/
│   └── shared-types/                 # Universal TypeScript definitions & data shapes
│       ├── index.ts
│       └── package.json
├── infrastructure/
│   ├── docker/
│   │   ├── backend.Dockerfile
│   │   ├── frontend.Dockerfile
│   │   └── docker-compose.yml
│   ├── nginx/
│   │   └── default.conf
│   ├── kubernetes/
│   │   ├── app-deployment.yaml
│   │   ├── db-deployment.yaml
│   │   ├── redis-deployment.yaml
│   │   └── ingress.yaml
│   └── terraform/
│       ├── main.tf
│       └── variables.tf
├── docs/
│   ├── architecture.md
│   └── api-spec.md
├── scripts/
│   ├── build-apk.sh
│   └── run-db-migrate.sh
├── package.json                      # Monorepo Workspace Configuration
└── tsconfig.json                     # Root TypeScript compiler settings
```

---

## 2. Production Architecture Design

The Logistic platform adopts a **layered clean architecture** patterns inside a **monorepo format** that ensures high modularity and prepares the system to be cleanly decoupled into microservices in the future.

```mermaid
graph TD
    %% Styling
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef gateway fill:#bbf,stroke:#333,stroke-width:2px;
    classDef app fill:#ddf,stroke:#333,stroke-width:2px;
    classDef db fill:#dfd,stroke:#333,stroke-width:2px;
    classDef queue fill:#fdd,stroke:#333,stroke-width:2px;

    %% Components
    SHG[SHG Mobile App - React Native]:::client
    Transporter[Transporter Mobile App - React Native]:::client
    Nginx[Nginx Reverse Proxy / API Gateway]:::gateway
    
    subgraph NestJS Backend Cluster
        API[NestJS App / Controllers]:::app
        SocketIO[Socket.IO Server]:::app
        Bull[BullMQ / Queue Producers]:::app
    end
    
    subgraph Storage & Caching
        Redis[(Redis Geospatial Cache & Queue Store)]:::queue
        PG[(PostgreSQL Database / Prisma ORM)]:::db
    end

    subgraph External Integrations
        FCM[Firebase Cloud Messaging]
        GMaps[Google Maps Distance Matrix]
    end

    %% Flows
    SHG -->|HTTPS Requests| Nginx
    Transporter -->|HTTPS Requests| Nginx
    Transporter -->|Websocket / Live Track| Nginx
    
    Nginx -->|Load Balances API| API
    Nginx -->|Streams Websockets| SocketIO
    
    API -->|Read/Write Model| PG
    API -->|Read/Write Session & Geocache| Redis
    API -->|Push Jobs| Bull
    
    SocketIO -->|Fetch Active Locations| Redis
    SocketIO -->|Publish Local updates| Redis
    
    Bull -->|Background Processor| Redis
    Bull -->|Trigger Push Alert| FCM
    API -->|Route Geo Optimization| GMaps
```

---

## 3. Database Schema Architecture (PostgreSQL + Prisma)

This is a production-level relational database schema designed for high-throughput queries, using optimal database indexing, foreign key cascade strategies, and spatial mapping profiles.

```prisma
// logistic/backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SHG_PARTNER
  TRANSPORTER_PARTNER
  ADMIN
  SUPER_ADMIN
}

enum ApplicationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
}

enum OrderStatus {
  CREATED
  SHG_PICKUP_ASSIGNED
  SHG_PICKED_UP
  IN_TRANSIT_TO_DARKSTORE
  ARRIVED_AT_DARKSTORE
  DISPATCHED_FROM_DARKSTORE
  TRANSPORTER_ASSIGNED
  TRANSPORTER_IN_TRANSIT
  SHG_DELIVERY_ASSIGNED
  SHG_DELIVERED
  CANCELLED
}

enum AssignmentStatus {
  PENDING
  ACCEPTED
  REJECTED
  COMPLETED
}

enum VehicleType {
  TWO_WHEELER
  THREE_WHEELER
  FOUR_WHEELER
  TRUCK
}

// 1. Users & Profiles
model User {
  id                String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  phoneNumber       String            @unique
  email             String?           @unique
  passwordHash      String
  fullName          String
  role              Role
  isVerified        Boolean           @default(false)
  applicationStatus ApplicationStatus @default(PENDING)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  // Relations
  shgProfile         ShgProfile?
  transporterProfile TransporterProfile?
  assignments        Assignment[]      @relation("AssignedToUser")
  createdOrders      Order[]           @relation("OrderCreator")
  notifications      Notification[]
  complaints         Complaint[]
  auditLogs          AuditLog[]

  @@index([phoneNumber])
  @@index([role])
}

model ShgProfile {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @unique @db.Uuid
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupName      String
  bankAccount    String
  ifscCode       String
  operatingLat   Float
  operatingLng   Float
  operatingArea  String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model TransporterProfile {
  id             String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String      @unique @db.Uuid
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicleType    VehicleType
  licenseNumber  String      @unique
  vehiclePlateNo String      @unique
  rating         Float       @default(5.0)
  isOnline       Boolean     @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}

// 2. Dark Stores (Warehouses)
model DarkStore {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String
  code      String   @unique
  address   String
  latitude  Float
  longitude Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]  @relation("DarkStoreOrders")
}

// 3. Orders & Logistics Workflow
model Order {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  trackingNumber  String      @unique
  creatorId       String      @db.Uuid
  creator         User        @relation("OrderCreator", fields: [creatorId], references: [id])
  status          OrderStatus @default(CREATED)
  darkStoreId     String      @db.Uuid
  darkStore       DarkStore   @relation("DarkStoreOrders", fields: [darkStoreId], references: [id])
  pickupAddress   String
  pickupLat       Float
  pickupLng       Float
  deliveryAddress String
  deliveryLat     Float
  deliveryLng     Float
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  items        OrderItem[]
  assignments  Assignment[]
  trackingLogs TrackingLog[]
  logistics    LogisticsStep[]

  @@index([trackingNumber])
  @@index([status])
}

model OrderItem {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId   String   @db.Uuid
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  itemName  String
  quantity  Int
  weight    Float
  createdAt DateTime @default(now())
}

model LogisticsStep {
  id        String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId   String      @db.Uuid
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  remark    String?
  timestamp DateTime    @default(now())

  @@index([orderId])
}

// 4. Geospatial Realtime Tracking logs
model TrackingLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId   String   @db.Uuid
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  latitude  Float
  longitude Float
  speed     Float?
  heading   Float?
  timestamp DateTime @default(now())

  @@index([orderId, timestamp])
}

// 5. Assignments Pipeline
model Assignment {
  id           String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId      String           @db.Uuid
  order        Order            @relation(fields: [orderId], references: [id], onDelete: Cascade)
  assignedToId String           @db.Uuid
  assignedTo   User             @relation("AssignedToUser", fields: [assignedToId], references: [id], onDelete: Cascade)
  status       AssignmentStatus @default(PENDING)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([orderId])
  @@index([assignedToId])
}

// 6. Notifications System
model Notification {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
}

// 7. Customer Relations & Support
model Complaint {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject     String
  description String
  isResolved  Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([userId])
}

// 8. Security Audits
model AuditLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String?  @db.Uuid
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())
}
```

---

## 4. Backend Module Architecture (Express + TypeScript)

Every backend domain module contains a strict boundary layout:
1. `routes.ts` - Declarative routes mapping endpoints to controller functions with validator guards.
Every backend domain module contains a strict NestJS modular boundary layout:
1. `dto/` - DTO (Data Transfer Objects) validating inputs using `class-validator` and `class-transformer`.
2. `logistics.controller.ts` - Exposes REST endpoints decorated with NestJS decorators, Swagger documentation, and guards.
3. `logistics.service.ts` - Handles core business logic and queries database via the dependency-injected `PrismaService`.
4. `logistics.module.ts` - Connects the controller and services, importing dependencies like `PrismaModule`.

### Code Scaffolding: `logistics` Module Example

#### 4.1. Core Validation DTOs (`dto/create-order.dto.ts`)
```typescript
import { IsString, IsNotEmpty, IsNumber, IsUUID, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ example: 'Handmade Soap' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  weight: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  darkStoreId: string;

  @ApiProperty({ example: '12, MG Road, Bengaluru' })
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @ApiProperty({ example: 12.9716 })
  @IsNumber()
  pickupLat: number;

  @ApiProperty({ example: 77.5946 })
  @IsNumber()
  pickupLng: number;

  @ApiProperty({ example: 'Darkstore Warehouse Alpha, Bengaluru' })
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @ApiProperty({ example: 12.9800 })
  @IsNumber()
  deliveryLat: number;

  @ApiProperty({ example: 77.6000 })
  @IsNumber()
  deliveryLng: number;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ example: 'Handover complete', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}
```

#### 4.2. Core Service (`logistics.service.ts`)
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class LogisticsService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    const trackingNumber = `LOG-${nanoid(8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create central order row
      const order = await tx.order.create({
        data: {
          trackingNumber,
          creatorId: userId,
          darkStoreId: dto.darkStoreId,
          pickupAddress: dto.pickupAddress,
          pickupLat: dto.pickupLat,
          pickupLng: dto.pickupLng,
          deliveryAddress: dto.deliveryAddress,
          deliveryLat: dto.deliveryLat,
          deliveryLng: dto.deliveryLng,
          status: OrderStatus.CREATED,
        },
      });

      // 2. Create related items
      await tx.orderItem.createMany({
        data: dto.items.map((item) => ({
          orderId: order.id,
          itemName: item.itemName,
          quantity: item.quantity,
          weight: item.weight,
        })),
      });

      // 3. Log initial pipeline state step
      await tx.logisticsStep.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CREATED,
          remark: 'Order created successfully',
        },
      });

      return order;
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, remark?: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      await tx.logisticsStep.create({
        data: {
          orderId,
          status,
          remark,
        },
      });

      return updatedOrder;
    });
  }
}
```

#### 4.3. Core Controller (`logistics.controller.ts`)
```typescript
import { Controller, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Logistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post()
  @Roles(Role.SHG_PARTNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new logistics order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async create(@GetUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.logisticsService.createOrder(userId, dto);
  }

  @Patch(':orderId/status')
  @Roles(Role.SHG_PARTNER, Role.TRANSPORTER_PARTNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update logistics order workflow status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.logisticsService.updateOrderStatus(orderId, dto.status, dto.remark);
  }
}
```

#### 4.4. Module Configuration (`logistics.module.ts`)
```typescript
import { Module } from '@nestjs/common';
import { LogisticsController } from './logistics.controller';
import { LogisticsService } from './logistics.service';
import { PrismaModule } from '../prisma/prisma.service'; // Adjust path if imported from common

@Module({
  imports: [PrismaModule],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
```

---


## 5. Frontend Architecture Layout (React Native)

Both mobile applications are standard React Native projects configured with TypeScript, styling micro-frameworks (StyleSheet or Tailwind NativeWind), and robust state management.

```text
apps/[app-name]/src/
├── api/
│   ├── client.ts             # Axios initialization with JWT Bearer Injector
│   └── endpoints.ts          # Static API Route Constants
├── redux/
│   ├── slices/
│   │   ├── authSlice.ts      # Active token, authenticated user info, refresh workflow
│   │   └── trackingSlice.ts  # Current route coordinates, active tracking flags
│   └── store.ts              # Global combined application state registry
└── hooks/
    ├── useAuth.ts            # Authentication abstractions (login, refresh, logout)
    └── useGeolocation.ts     # Real-time background location updates manager
```

### Custom React Native Geospatial Hook (`useGeolocation.ts`)
This production hook uses the native geolocation module to sample driver coordinates and emit them to the active real-time WebSockets connection.

```typescript
import { useEffect, useRef } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

export const useGeolocation = (orderId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (!token || !orderId) return;

    // 1. Establish secure socket connection
    socketRef.current = io(process.env.EXPO_PUBLIC_API_URL || 'https://api.logistic.internal', {
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current.emit('join:tracking', { orderId });

    // 2. Setup active GPS tracking watchers
    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        
        socketRef.current?.emit('tracking:location_update', {
          orderId,
          latitude,
          longitude,
          speed,
          heading,
          timestamp: new Date().toISOString()
        });
      },
      (error) => console.error("GPS Watch Error: ", error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Send update every 10 meters moved
        interval: 5000,     // Frequency limit of 5s
        fastestInterval: 2000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      socketRef.current?.disconnect();
    };
  }, [token, orderId]);
};
```

---

## 6. Realtime & Socket.IO Tracking Pipeline

Websockets must handle real-time geospatial coordinate ingestion with ultra-low latency, offloading write operations from PostgreSQL by buffering logs inside Redis and syncing them periodically.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Transporter Device
    participant Gateway as Socket.IO Gateway
    participant Redis as Redis Cache (Geo-spatial)
    participant Database as PostgreSQL (Prisma)
    actor Buyer as Buyer / SHG Screen

    Driver->>Gateway: emit("tracking:location_update", { orderId, latitude, longitude })
    activate Gateway
    Gateway->>Redis: GEOADD tracking:active_locations longitude latitude orderId
    Gateway->>Buyer: emit("tracking:location_broadcast", { orderId, latitude, longitude })
    deactivate Gateway

    Note over Redis, Database: Cron Job Syncs locations to Postgres in background every 10s
    Redis->>Database: Insert bulk rows into TrackingLog Table
```

### Gateway Architecture Scaffolding (`socket.gateway.ts`)
```typescript
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const registerSocketGateway = (server: any) => {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket']
  });

  // Authorization handshake middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication failed: Missing token'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication failed: Invalid credentials'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Connected client: ${socket.id} (${socket.data.user.role})`);

    socket.on('join:tracking', ({ orderId }) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('tracking:location_update', async (data) => {
      const { orderId, latitude, longitude, speed, heading } = data;

      // 1. Buffer update into Redis Geospatial Store
      await redis.geoadd('active_orders', longitude, latitude, orderId);
      
      // 2. Cache latest track log
      await redis.set(`latest_position:${orderId}`, JSON.stringify({ latitude, longitude, speed, heading }));

      // 3. Low-latency broadcast to active subscribers (e.g. Buyer, SHG Partner)
      io.to(`order:${orderId}`).emit('tracking:location_broadcast', {
        orderId,
        latitude,
        longitude,
        speed,
        heading
      });
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected client: ${socket.id}`);
    });
  });
};
```

---

## 7. DevOps & Staging Container Orchestration

To run the full stack locally with complete service discovery, we configure Docker, Docker Compose, and Nginx reverse routing.

### 7.1. Staging Reverse Proxy (`nginx/default.conf`)
```nginx
# logistic/infrastructure/nginx/default.conf

upstream backend_cluster {
    server backend:4000;
}

server {
    listen 80;
    server_name api.logistic.local;

    # Rate limiting zone configuration reference
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=15r/s;

    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Websockets Socket.IO gateway routing
    location /socket.io/ {
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7.2. Orchestration Environment (`docker-compose.yml`)
```yaml
# logistic/infrastructure/docker/docker-compose.yml

version: '3.8'

services:
  database:
    image: postgres:15-alpine
    container_name: logistic_postgres
    restart: always
    environment:
      POSTGRES_DB: logistic_dev
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    container_name: logistic_redis
    restart: always
    ports:
      - "6379:6379"

  backend:
    build:
      context: ../../backend
      dockerfile: ../infrastructure/docker/backend.Dockerfile
    container_name: logistic_backend
    restart: always
    environment:
      DATABASE_URL: "postgresql://admin:password123@database:5432/logistic_dev?schema=public"
      REDIS_URL: "redis://cache:6379"
      JWT_SECRET: "supersecretkey123"
    ports:
      - "4000:4000"
    depends_on:
      - database
      - cache

  nginx:
    image: nginx:alpine
    container_name: logistic_nginx
    restart: always
    ports:
      - "80:80"
    volumes:
      - ../nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 8. Scaling Strategy

To handle high traffic, the system implements standard architectural scaling rules:

```mermaid
graph LR
    %% Scaling Nodes
    LB[Nginx / AWS ALB] --> Web1[Backend Node 1]
    LB --> Web2[Backend Node 2]
    
    Web1 --> PgBouncer[PgBouncer Connection Pooler]
    Web2 --> PgBouncer
    
    PgBouncer --> DB_Master[(PostgreSQL Master - Writes)]
    DB_Master -->|Streaming Replication| DB_Replica[(PostgreSQL Replica - Reads)]
    
    Web1 --> RedisCluster{Redis Geospatial Cluster}
    Web2 --> RedisCluster
```

1. **Database Scaling**:
   - Introduce **PgBouncer** inside backend clusters for high-performance connection pooling.
   - Separate master (write operations) and read-replicas (used heavily by screens like earnings, historical routing logs, active assignments).
2. **Caching Strategy**:
   - Cache static lists, dark store catalogs, and active assignment queues on Redis with smart expiration limits (TTL).
3. **Geo-spatial Scaling**:
   - Utilize Redis Clusters to partition spatial location maps cleanly using consistent hashing, ensuring optimal processing of driver coordinates.

---

## 9. Security Best Practices

1. **Hierarchical Authentication**:
   - Role-based authorization rules (RBAC) validated via standard TypeScript decorators/middlewares (`jwtAuthGuard`, `roleGuard`).
2. **Input Sanitization & Protection**:
   - Complete schema safety: Validating payload contracts at compile-time and runtime using **class-validator** DTO decorators.
   - Use **Helmet** in NestJS to disable identifying stack headers (e.g. `X-Powered-By`).
3. **Sensitive Key Management**:
   - Storing all operational configurations inside environment values (`.env`), injected via Kubernetes Secrets in production.

---

## 10. Git Strategy & APK Build Workflow

### 10.1. Git Branching Model
The project uses standard Git Flow:

```text
main       <-- Production Ready Branch
  ▲
  │ (Hotfix releases)
  ▼
dev        <-- Development Integration Branch
  ▲
  ├── feature/auth-otp       <-- Feature Branches (Merged into dev via PRs)
  ├── feature/live-tracking
  └── bugfix/gps-drift
```

- **`main`**: The canonical production code. Direct commits are strictly blocked. Release tags are initiated here.
- **`dev`**: The working integration branch. Every sub-branch must target `dev` through approved pull requests requiring static validation checks (eslint, compile, unit test).
- **`feature/*`**: Feature development. Branches off `dev` and merges back when feature tests pass.
- **`bugfix/*`**: Target patch fixes. Merges into `dev`.
- **`hotfix/*`**: Emergency production patches. Branches off `main` and merges back into both `main` and `dev` simultaneously.

---

### 10.2. Production APK Generation Workflow (React Native)

To compile separate release APKs for the **SHG App** and **Transporter App**:

```mermaid
graph TD
    Start[Develop Code] --> BuildJS[Compile TS Bundles]
    BuildJS --> AssetCompile[Bundle Assets & Images]
    AssetCompile --> GradleSign[Assemble & Sign Release Build]
    GradleSign --> Distribute[Distribute to App Center / Play Store]
```

#### Step 1: Generate Cryptographic Upload Key
A secure keystore file is generated to cryptographically sign the compiled package.
```bash
keytool -genkey -v -keystore release.keystore -alias release-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
*Place the generated `release.keystore` file inside `apps/shg-app/android/app/` and `apps/transporter-app/android/app/` directories.*

#### Step 2: Configure Android Build Variables (`android/app/build.gradle`)
Configure the release compilation task to bind with the Keystore credentials:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true // Enable Proguard code shrinking
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

#### Step 3: Run Compilation Command
Use the React Native bundler to build the release binary:

* **SHG App release APK build**:
  ```bash
  cd apps/shg-app/android && ./gradlew assembleRelease
  ```
  *Output binary location: `apps/shg-app/android/app/build/outputs/apk/release/app-release.apk`*

* **Transporter App release APK build**:
  ```bash
  cd apps/transporter-app/android && ./gradlew assembleRelease
  ```
  *Output binary location: `apps/transporter-app/android/app/build/outputs/apk/release/app-release.apk`*
