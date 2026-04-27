declare module '*tact_StudentDao' {
  export class StudentDao {
    static fromInit(...args: any[]): Promise<any>;
    address: any;
    send(...args: any[]): Promise<any>;
  }
}
