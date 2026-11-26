/**
 * DEMONSTRATIVE relational model (Oracle) for the Engineering Lab.
 * Illustrative only — it is not the API's current storage (an in-memory catalog).
 */
export type EntityName = "PROJECT" | "TECHNOLOGY" | "PROJECT_TECHNOLOGY" | "CONTACT_MESSAGE";

export interface Column {
  name: string;
  type: string;
  pk?: boolean;
  fk?: EntityName;
}

export interface Entity {
  name: EntityName;
  columns: Column[];
  /** Top-left position in the SVG diagram (viewBox 0 0 770 460; boxes are 200 wide, 34 + 24/row + 10 tall). */
  x: number;
  y: number;
  sql: string;
}

export interface Relation {
  from: EntityName;
  to: EntityName;
  label: string; // cardinality
}

export const entities: Entity[] = [
  {
    name: "PROJECT",
    x: 20,
    y: 30,
    columns: [
      { name: "id", type: "VARCHAR2(40)", pk: true },
      { name: "title", type: "VARCHAR2(120)" },
      { name: "status", type: "VARCHAR2(12)" },
      { name: "live_url", type: "VARCHAR2(255)" },
      { name: "verified", type: "CHAR(1)" },
      { name: "display_order", type: "NUMBER(3)" },
    ],
    sql: `-- Table with CHECK constraints
CREATE TABLE project (
  id            VARCHAR2(40)  CONSTRAINT pk_project PRIMARY KEY,
  title         VARCHAR2(120) NOT NULL,
  status        VARCHAR2(12)  NOT NULL
                CONSTRAINT ck_project_status
                CHECK (status IN ('PUBLISHED','ACADEMIC','IN_PROGRESS','STUDY')),
  live_url      VARCHAR2(255),
  verified      CHAR(1) DEFAULT 'N' NOT NULL
                CONSTRAINT ck_project_verified CHECK (verified IN ('Y','N')),
  display_order NUMBER(3) NOT NULL
);

-- Published projects first, by display order
SELECT id, title, status
  FROM project
 WHERE status = 'PUBLISHED'
 ORDER BY display_order;`,
  },
  {
    name: "PROJECT_TECHNOLOGY",
    x: 290,
    y: 150,
    columns: [
      { name: "project_id", type: "VARCHAR2(40)", pk: true, fk: "PROJECT" },
      { name: "technology_id", type: "NUMBER", pk: true, fk: "TECHNOLOGY" },
    ],
    sql: `-- N:N association with a composite primary key
CREATE TABLE project_technology (
  project_id    VARCHAR2(40) NOT NULL,
  technology_id NUMBER       NOT NULL,
  CONSTRAINT pk_project_technology PRIMARY KEY (project_id, technology_id),
  CONSTRAINT fk_pt_project FOREIGN KEY (project_id)
    REFERENCES project (id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_technology FOREIGN KEY (technology_id)
    REFERENCES technology (id)
);

-- View: each project with its technologies in one row
CREATE OR REPLACE VIEW vw_project_stack AS
SELECT p.id,
       p.title,
       LISTAGG(t.name, ', ') WITHIN GROUP (ORDER BY t.name) AS stack
  FROM project p
  LEFT JOIN project_technology pt ON pt.project_id = p.id
  LEFT JOIN technology t          ON t.id = pt.technology_id
 GROUP BY p.id, p.title;`,
  },
  {
    name: "TECHNOLOGY",
    x: 560,
    y: 30,
    columns: [
      { name: "id", type: "NUMBER", pk: true },
      { name: "name", type: "VARCHAR2(60)" },
      { name: "category", type: "VARCHAR2(20)" },
    ],
    sql: `-- Identity column + unique constraint
CREATE TABLE technology (
  id       NUMBER GENERATED ALWAYS AS IDENTITY
           CONSTRAINT pk_technology PRIMARY KEY,
  name     VARCHAR2(60) NOT NULL
           CONSTRAINT uq_technology_name UNIQUE,
  category VARCHAR2(20) NOT NULL
);

-- How many projects use each technology
SELECT t.name, COUNT(pt.project_id) AS projects
  FROM technology t
  LEFT JOIN project_technology pt ON pt.technology_id = t.id
 GROUP BY t.name
 ORDER BY projects DESC, t.name;`,
  },
  {
    name: "CONTACT_MESSAGE",
    x: 560,
    y: 262,
    columns: [
      { name: "id", type: "VARCHAR2(36)", pk: true },
      { name: "name", type: "VARCHAR2(80)" },
      { name: "email", type: "VARCHAR2(120)" },
      { name: "subject", type: "VARCHAR2(120)" },
      { name: "message", type: "CLOB" },
      { name: "received_at", type: "TIMESTAMP" },
    ],
    sql: `-- Mirrors the API validation rules as constraints
CREATE TABLE contact_message (
  id          VARCHAR2(36)  CONSTRAINT pk_contact_message PRIMARY KEY,
  name        VARCHAR2(80)  NOT NULL,
  email       VARCHAR2(120) NOT NULL,
  subject     VARCHAR2(120),
  message     CLOB          NOT NULL,
  received_at TIMESTAMP     NOT NULL,
  CONSTRAINT ck_contact_name CHECK (LENGTH(name) BETWEEN 2 AND 80)
);

-- Trigger: stamp the reception time on insert
CREATE OR REPLACE TRIGGER trg_contact_received_at
BEFORE INSERT ON contact_message
FOR EACH ROW
BEGIN
  IF :NEW.received_at IS NULL THEN
    :NEW.received_at := SYSTIMESTAMP;
  END IF;
END;
/`,
  },
];

export const relations: Relation[] = [
  { from: "PROJECT", to: "PROJECT_TECHNOLOGY", label: "1 : N" },
  { from: "TECHNOLOGY", to: "PROJECT_TECHNOLOGY", label: "1 : N" },
];
